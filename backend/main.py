import os
import json
import datetime
import shutil
import socket
import tempfile
from contextlib import asynccontextmanager
from typing import Optional

import ollama
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import (
    get_db, init_db, seed_tickets_if_empty, SessionLocal,
    Ticket, TicketTag, Cluster, DictJob, DistressFlag, EmailLog,
)
from backend.config import CLUSTER_THRESHOLD, GMAIL_USER, ADVISOR_EMAIL
from backend.agents.agent1_helpdesk import classify_ticket
from backend.agents.agent2_dictionary import generate_dictionary, generate_dictionary_confirmed
from backend.services.email_service import send_email, send_with_attachment
from backend.services.pattern_detector import run_pattern_detection
from backend.services.scheduler import start_scheduler, stop_scheduler, scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_tickets_if_empty(db)
        run_pattern_detection(db)
    finally:
        db.close()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="MESA API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ──────────────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    text: str
    user_email: Optional[str] = None


# ── POST /tickets ────────────────────────────────────────────────────────────

@app.post("/tickets")
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db)):
    classification = classify_ticket(payload.text)

    ticket = Ticket(
        text=payload.text,
        category=classification.get("category", "other"),
        system_affected=classification.get("system_affected", "other"),
        severity=classification.get("severity", "medium"),
        auto_resolved=classification.get("auto_resolved", False),
        resolution=classification.get("resolution"),
    )
    db.add(ticket)
    db.flush()

    tag = TicketTag(
        ticket_id=ticket.id,
        topic=classification.get("topic", "unclassified"),
        system=classification.get("system_affected", "other"),
        error_type=classification.get("error_type", "unknown"),
    )
    db.add(tag)
    db.commit()

    if payload.user_email and ticket.resolution:
        result = send_email(
            to_addr=payload.user_email,
            subject=f"MESA Ticket #{ticket.id}: {classification.get('category', 'Support')}",
            body=f"Your ticket has been received.\n\n{ticket.resolution}\n\nTicket ID: #{ticket.id}",
        )
        log = EmailLog(
            to_addr=payload.user_email,
            subject=f"Ticket #{ticket.id} resolution",
            success=result["success"],
            error_msg=result.get("error"),
        )
        db.add(log)
        db.commit()

    triggered = run_pattern_detection(db)

    return {
        "ticket_id": ticket.id,
        "classification": classification,
        "pattern_triggered": len(triggered) > 0,
        "triggered_clusters": triggered,
    }


# ── GET /tickets ─────────────────────────────────────────────────────────────

@app.get("/tickets")
def list_tickets(db: Session = Depends(get_db)):
    tickets = db.query(Ticket).order_by(Ticket.created_at.desc()).all()
    return [
        {
            "id": t.id,
            "text": t.text[:120],
            "category": t.category,
            "system_affected": t.system_affected,
            "severity": t.severity,
            "auto_resolved": t.auto_resolved,
            "resolution": t.resolution,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in tickets
    ]


# ── GET /clusters ─────────────────────────────────────────────────────────────

@app.get("/clusters")
def list_clusters(db: Session = Depends(get_db)):
    clusters = db.query(Cluster).order_by(Cluster.count.desc()).all()
    return [
        {
            "id": c.id,
            "topic": c.topic,
            "system": c.system,
            "count": c.count,
            "last_seen": c.last_seen.isoformat() if c.last_seen else None,
            "threshold_hit": c.threshold_hit,
            "agent2_triggered": c.agent2_triggered,
        }
        for c in clusters
    ]


# ── POST /clusters/trigger ────────────────────────────────────────────────────

@app.post("/clusters/trigger")
def trigger_agent2(cluster_id: int, db: Session = Depends(get_db)):
    cluster = db.query(Cluster).filter_by(id=cluster_id).first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    cluster.agent2_triggered = True
    db.commit()
    return {"status": "triggered", "cluster": cluster.system}


# ── GET /dashboard-stats ──────────────────────────────────────────────────────

@app.get("/dashboard-stats")
def dashboard_stats(db: Session = Depends(get_db)):
    today = datetime.datetime.now(datetime.timezone.utc).date()
    today_start = datetime.datetime.combine(today, datetime.time.min)
    tickets_today = db.query(Ticket).filter(Ticket.created_at >= today_start).count()
    total = db.query(Ticket).count() or 1
    auto_res = db.query(Ticket).filter_by(auto_resolved=True).count()
    week_ago = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=7)
    dict_jobs = db.query(DictJob).filter(DictJob.created_at >= week_ago).count()
    students_flagged = db.query(DistressFlag).filter(DistressFlag.created_at >= week_ago).count()
    top_clusters = (
        db.query(Cluster).order_by(Cluster.count.desc()).limit(5).all()
    )
    return {
        "tickets_today": tickets_today,
        "auto_resolution_rate": round(auto_res / total * 100, 1),
        "dict_jobs_this_week": dict_jobs,
        "students_flagged_this_week": students_flagged,
        "top_clusters": [
            {"system": c.system, "topic": c.topic, "count": c.count, "threshold_hit": c.threshold_hit}
            for c in top_clusters
        ],
    }


# ── POST /generate-dictionary ─────────────────────────────────────────────────

@app.post("/generate-dictionary")
def generate_dict(
    file: UploadFile = File(...),
    confirmed: bool = False,
    triggered_by_cluster: str = "",
    db: Session = Depends(get_db),
):
    allowed = {".csv", ".json"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type {ext} not supported. Use .csv or .json")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    job = DictJob(filename=file.filename, status="processing", triggered_by_cluster=triggered_by_cluster)
    db.add(job)
    db.commit()

    try:
        if confirmed:
            result = generate_dictionary_confirmed(tmp_path)
        else:
            result = generate_dictionary(tmp_path)

        if result.get("ferpa_flag"):
            job.status = "ferpa_pending"
            db.commit()
            return {"ferpa_flag": True, "sensitive_fields": result["sensitive_fields"], "job_id": job.id}

        if result.get("error"):
            job.status = "failed"
            db.commit()
            raise HTTPException(status_code=500, detail=result["error"])

        job.status = "completed"
        job.artifact_path = result["artifact_path"]
        db.commit()

        email_result = send_with_attachment(
            to_addr=ADVISOR_EMAIL,
            subject=f"MESA: Data dictionary generated for {file.filename}",
            body=f"Agent 2 has generated a data dictionary for {file.filename}.\n{result['entry_count']} fields documented.",
            filepath=result["artifact_path"],
        )
        log = EmailLog(
            to_addr=ADVISOR_EMAIL,
            subject=f"Dict artifact: {file.filename}",
            success=email_result["success"],
            error_msg=email_result.get("error"),
        )
        db.add(log)
        db.commit()

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return {"job_id": job.id, "entry_count": result["entry_count"], "artifact_path": result["artifact_path"]}


# ── GET /dict-jobs ────────────────────────────────────────────────────────────

@app.get("/dict-jobs")
def list_dict_jobs(db: Session = Depends(get_db)):
    jobs = db.query(DictJob).order_by(DictJob.created_at.desc()).all()
    return [
        {
            "id": j.id,
            "filename": j.filename,
            "status": j.status,
            "artifact_path": j.artifact_path,
            "triggered_by_cluster": j.triggered_by_cluster,
            "created_at": j.created_at.isoformat() if j.created_at else None,
        }
        for j in jobs
    ]


# ── GET /distress-flags ───────────────────────────────────────────────────────

@app.get("/distress-flags")
def list_distress_flags(db: Session = Depends(get_db)):
    flags = db.query(DistressFlag).filter_by(status="pending").order_by(DistressFlag.risk_score.desc()).all()
    return [
        {
            "id": f.id,
            "student_id": f.student_id,
            "risk_score": f.risk_score,
            "risk_level": f.risk_level,
            "risk_factors": json.loads(f.risk_factors) if f.risk_factors else [],
            "recommended_action": f.recommended_action,
            "report_path": f.report_path,
            "status": f.status,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f in flags
    ]


# ── POST /distress-flags/{id}/approve ────────────────────────────────────────

@app.post("/distress-flags/{flag_id}/approve")
def approve_flag(flag_id: int, db: Session = Depends(get_db)):
    flag = db.query(DistressFlag).filter_by(id=flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    factors = json.loads(flag.risk_factors) if flag.risk_factors else []
    body = (
        f"Student {flag.student_id} has been flagged for academic distress.\n\n"
        f"Risk Score: {flag.risk_score}/100 ({flag.risk_level})\n\n"
        f"Risk Signals:\n" + "\n".join(f"- {r}" for r in factors) +
        f"\n\nRecommended Action:\n{flag.recommended_action}"
    )
    result = send_email(
        to_addr=ADVISOR_EMAIL,
        subject=f"MESA Alert: Student {flag.student_id} Distress Flag",
        body=body,
    )
    log = EmailLog(
        to_addr=ADVISOR_EMAIL,
        subject=f"Distress alert: {flag.student_id}",
        success=result["success"],
        error_msg=result.get("error"),
    )
    db.add(log)
    flag.status = "approved"
    flag.reviewed_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return {"status": "approved", "email_sent": result["success"]}


# ── POST /distress-flags/{id}/dismiss ────────────────────────────────────────

@app.post("/distress-flags/{flag_id}/dismiss")
def dismiss_flag(flag_id: int, db: Session = Depends(get_db)):
    flag = db.query(DistressFlag).filter_by(id=flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    flag.status = "dismissed"
    flag.reviewed_at = datetime.datetime.now(datetime.timezone.utc)
    db.commit()
    return {"status": "dismissed"}


# ── GET /system-health ────────────────────────────────────────────────────────

@app.get("/system-health")
def system_health():
    try:
        ollama.list()
        ollama_status = "online"
    except Exception as e:
        ollama_status = f"offline: {str(e)[:60]}"

    try:
        with socket.create_connection(("smtp.gmail.com", 587), timeout=3):
            smtp_status = "online"
    except Exception:
        smtp_status = "offline"

    return {
        "ollama": ollama_status,
        "gmail_smtp": smtp_status,
        "scheduler": "running" if scheduler.running else "stopped",
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
