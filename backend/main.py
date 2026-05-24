import csv
import os
import json
import uuid
import datetime
import shutil
import socket
from contextlib import asynccontextmanager
from typing import Optional

import ollama
from fastapi import BackgroundTasks, FastAPI, Depends, Form, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import (
    get_db, init_db, normalize_unanswered_ticket_statuses, seed_tickets_if_empty, SessionLocal,
    ticket_status_for_resolution,
    Ticket, TicketTag, TicketMessage, Cluster, DictJob, DistressFlag, EmailLog,
)
from backend.config import CLUSTER_THRESHOLD, GMAIL_USER, ADVISOR_EMAIL, UPLOADS_DIR, IT_TEAM_EMAIL
from backend.agents.agent1_helpdesk import classify_ticket
from backend.agents.agent2_dictionary import generate_dictionary_confirmed, scan_schema_for_ferpa
from backend.agents.agent4_conversation import generate_thread_response
from backend.services.rag_service import load_knowledge_base
from backend.services.email_service import send_email, send_with_attachment
from backend.services.pattern_detector import run_pattern_detection
from backend.services.scheduler import start_scheduler, stop_scheduler, scheduler

INSTITUTIONAL_DOMAIN = "mines.edu"


def _validate_institutional_email(email: str) -> bool:
    return email.strip().lower().endswith(f"@{INSTITUTIONAL_DOMAIN}")


def _process_dict_job(job_id: int, file_path: str, faculty_email: str, filename: str):
    db = SessionLocal()
    job = None
    try:
        job = db.query(DictJob).filter_by(id=job_id).first()
        if job:
            job.status = "processing"
            db.commit()

        result = generate_dictionary_confirmed(file_path)

        if result.get("error"):
            if job:
                job.status = "failed"
                db.commit()
            send_email(
                to_addr=faculty_email,
                subject=f"MESA: Dictionary generation failed — {filename}",
                body=(
                    f"Your data dictionary request for '{filename}' could not be completed.\n\n"
                    f"Error: {result['error']}\n\n"
                    f"Please retry or contact IT support."
                ),
            )
            return

        if job:
            job.status = "completed"
            job.artifact_path = result["artifact_path"]
            job.entry_count = result["entry_count"]
            db.commit()

        email_result = send_with_attachment(
            to_addr=faculty_email,
            subject=f"MESA: Data dictionary ready — {filename}",
            body=(
                f"Your data dictionary for '{filename}' has been generated.\n\n"
                f"{result['entry_count']} fields documented.\n\n"
                f"The attached CSV contains field names, data types, descriptions, source systems, "
                f"sensitivity classifications, and example values.\n\n"
                f"Generated using local inference only. No schema data was sent to external APIs."
            ),
            filepath=result["artifact_path"],
        )
        log = EmailLog(
            to_addr=faculty_email,
            subject=f"Dict delivery: {filename}",
            success=email_result["success"],
            error_msg=email_result.get("error"),
        )
        db.add(log)
        db.commit()

    except Exception as e:
        try:
            if job:
                job.status = "failed"
                db.commit()
            err_result = send_email(
                to_addr=faculty_email,
                subject=f"MESA: Dictionary generation failed — {filename}",
                body=f"Your data dictionary request for '{filename}' could not be completed. Please retry or contact IT support.",
            )
            err_log = EmailLog(
                to_addr=faculty_email,
                subject=f"Dict failure: {filename}",
                success=err_result["success"],
                error_msg=err_result.get("error"),
            )
            db.add(err_log)
            db.commit()
        except Exception:
            pass
    finally:
        db.close()
        if os.path.exists(file_path):
            os.unlink(file_path)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_tickets_if_empty(db)
        normalize_unanswered_ticket_statuses(db)
        run_pattern_detection(db)
    finally:
        db.close()
    load_knowledge_base()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="MESA API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Helpers ─────────────────────────────────────────────────────────────────

def _utc_iso(dt: datetime.datetime | None) -> str | None:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    else:
        dt = dt.astimezone(datetime.timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _serialize_message(m: TicketMessage) -> dict:
    return {
        "id": m.id,
        "sender": m.sender,
        "content": m.content,
        "created_at": _utc_iso(m.created_at),
    }


# ── Models ──────────────────────────────────────────────────────────────────

class TicketCreate(BaseModel):
    text: str
    user_email: Optional[str] = None


# ── POST /tickets ────────────────────────────────────────────────────────────

@app.post("/tickets")
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db)):
    classification = classify_ticket(payload.text)

    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    ticket = Ticket(
        text=payload.text,
        category=classification.get("category", "other"),
        system_affected=classification.get("system_affected", "other"),
        severity=classification.get("severity", "medium"),
        auto_resolved=classification.get("auto_resolved", False),
        resolution=classification.get("resolution"),
        status=ticket_status_for_resolution(classification.get("resolution")),
        last_activity=now,
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

    if classification.get("resolution"):
        first_msg = TicketMessage(
            ticket_id=ticket.id,
            sender="ai",
            content=classification["resolution"],
        )
        db.add(first_msg)

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
            "status": t.status or ticket_status_for_resolution(t.resolution),
            "created_at": _utc_iso(t.created_at),
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
            "last_seen": _utc_iso(c.last_seen),
            "threshold_hit": c.threshold_hit,
            "agent2_triggered": c.agent2_triggered,
            "dict_eligible": c.dict_eligible,
            "it_notified": c.it_notified,
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


# ── POST /clusters/notify-it ─────────────────────────────────────────────────

@app.post("/clusters/notify-it")
def notify_it_team(cluster_id: int, db: Session = Depends(get_db)):
    cluster = db.query(Cluster).filter_by(id=cluster_id).first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    if not IT_TEAM_EMAIL:
        raise HTTPException(status_code=503, detail="IT_TEAM_EMAIL not configured")
    result = send_email(
        to_addr=IT_TEAM_EMAIL,
        subject=f"MESA Alert: {cluster.system} cluster threshold reached — {cluster.topic}",
        body=(
            f"A support ticket cluster has exceeded the alert threshold and requires IT attention.\n\n"
            f"System: {cluster.system}\n"
            f"Topic: {cluster.topic}\n"
            f"Ticket count: {cluster.count} (threshold: {CLUSTER_THRESHOLD})\n\n"
            f"This pattern was detected automatically by MESA. "
            f"Please review and assign to the appropriate team.\n\n"
            f"View in MESA admin: http://localhost:5173/admin/clusters"
        ),
    )
    log = EmailLog(
        to_addr=IT_TEAM_EMAIL,
        subject=f"IT alert: {cluster.system}/{cluster.topic}",
        success=result["success"],
        error_msg=result.get("error"),
    )
    db.add(log)
    if result["success"]:
        cluster.it_notified = True
    db.commit()
    return {"status": "notified", "success": result["success"]}


# ── GET /dashboard-stats ──────────────────────────────────────────────────────

@app.get("/dashboard-stats")
def dashboard_stats(db: Session = Depends(get_db)):
    # SQLite stores datetimes as naive UTC strings — use naive UTC for comparisons
    # Rolling 24h window avoids UTC-midnight cutoff mismatching user's local timezone
    now_utc = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    last_24h = now_utc - datetime.timedelta(hours=24)
    tickets_today = db.query(Ticket).filter(Ticket.created_at >= last_24h).count()
    total = db.query(Ticket).count()
    week_ago = now_utc - datetime.timedelta(days=7)
    dict_jobs = db.query(DictJob).filter(DictJob.created_at >= week_ago).count()
    students_flagged = db.query(DistressFlag).filter(DistressFlag.created_at >= week_ago).count()
    top_clusters = (
        db.query(Cluster).order_by(Cluster.count.desc()).limit(5).all()
    )
    status_breakdown = {
        "ai_responded": db.query(Ticket).filter(
            (Ticket.status == "ai_responded") | (Ticket.status == None)
        ).count(),
        "escalated":     db.query(Ticket).filter_by(status="escalated").count(),
        "resolved":      db.query(Ticket).filter_by(status="resolved").count(),
        "auto_resolved": db.query(Ticket).filter_by(status="auto_resolved").count(),
        "open":          db.query(Ticket).filter_by(status="open").count(),
    }
    return {
        "tickets_today": tickets_today,
        "total_tickets": total,
        "status_breakdown": status_breakdown,
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
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    faculty_email: str = Form(...),
    confirmed: bool = False,
    triggered_by_cluster: str = "",
    db: Session = Depends(get_db),
):
    if not faculty_email or "@" not in faculty_email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    allowed = {".csv", ".json"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type {ext} not supported. Use .csv or .json")

    os.makedirs(UPLOADS_DIR, exist_ok=True)
    upload_path = os.path.join(UPLOADS_DIR, f"{uuid.uuid4().hex}{ext}")
    with open(upload_path, "wb") as f_out:
        shutil.copyfileobj(file.file, f_out)

    if not confirmed:
        scan = scan_schema_for_ferpa(upload_path)
        if scan["ferpa_flag"]:
            os.unlink(upload_path)
            return {"ferpa_flag": True, "sensitive_fields": scan["sensitive_fields"]}

    job = DictJob(
        filename=file.filename,
        status="queued",
        triggered_by_cluster=triggered_by_cluster,
        faculty_email=faculty_email,
    )
    db.add(job)
    db.commit()

    conf_result = send_email(
        to_addr=faculty_email,
        subject=f"MESA: Schema received — {file.filename}",
        body=(
            f"Your schema file '{file.filename}' has been received and is queued for processing.\n\n"
            f"The data dictionary will be generated using local inference only. "
            f"No schema data will be sent to external APIs.\n\n"
            f"You will receive the completed CSV by email within 5-10 minutes.\n\n"
            f"Job ID: #{job.id}"
        ),
    )
    conf_log = EmailLog(
        to_addr=faculty_email,
        subject=f"Schema receipt: {file.filename}",
        success=conf_result["success"],
        error_msg=conf_result.get("error"),
    )
    db.add(conf_log)
    db.commit()

    background_tasks.add_task(_process_dict_job, job.id, upload_path, faculty_email, file.filename)

    return {
        "job_id": job.id,
        "status": "queued",
        "message": f"Received. Dictionary will be emailed to {faculty_email} within 5-10 minutes.",
    }


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
            "faculty_email": j.faculty_email,
            "entry_count": j.entry_count,
            "created_at": _utc_iso(j.created_at),
        }
        for j in jobs
    ]


# ── GET /dict-jobs/{id}/entries ──────────────────────────────────────────────

@app.get("/dict-jobs/{job_id}/entries")
def get_dict_job_entries(job_id: int, db: Session = Depends(get_db)):
    job = db.query(DictJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed" or not job.artifact_path:
        raise HTTPException(status_code=400, detail="Artifact not ready")
    if not os.path.exists(job.artifact_path):
        raise HTTPException(status_code=404, detail="Artifact file missing from server")
    entries = []
    with open(job.artifact_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            entries.append(dict(row))
    return entries


# ── GET /dict-jobs/{id}/download ─────────────────────────────────────────────

@app.get("/dict-jobs/{job_id}/download")
def download_dict_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(DictJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed" or not job.artifact_path:
        raise HTTPException(status_code=400, detail="Artifact not ready")
    if not os.path.exists(job.artifact_path):
        raise HTTPException(status_code=404, detail="Artifact file missing from server")
    return FileResponse(
        path=job.artifact_path,
        media_type="text/csv",
        filename=os.path.basename(job.artifact_path),
    )


# ── POST /dict-jobs/{id}/resend ───────────────────────────────────────────────

@app.post("/dict-jobs/{job_id}/resend")
def resend_dict_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(DictJob).filter_by(id=job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "completed" or not job.artifact_path:
        raise HTTPException(status_code=400, detail="Artifact not ready — cannot resend")
    if not job.faculty_email:
        raise HTTPException(status_code=400, detail="No faculty email on record for this job")
    if not os.path.exists(job.artifact_path):
        raise HTTPException(status_code=404, detail="Artifact file missing from server")
    result = send_with_attachment(
        to_addr=job.faculty_email,
        subject=f"MESA: Data dictionary (resent) — {job.filename}",
        body=(
            f"Your data dictionary for '{job.filename}' has been resent by an administrator.\n\n"
            f"{job.entry_count or '—'} fields documented.\n\n"
            f"Generated using local inference only. No schema data was sent to external APIs."
        ),
        filepath=job.artifact_path,
    )
    log = EmailLog(
        to_addr=job.faculty_email,
        subject=f"Dict resend: {job.filename}",
        success=result["success"],
        error_msg=result.get("error"),
    )
    db.add(log)
    db.commit()
    return {"status": "sent", "to": job.faculty_email, "success": result["success"]}


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
            "created_at": _utc_iso(f.created_at),
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
    flag.reviewed_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"status": "approved", "email_sent": result["success"]}


# ── POST /distress-flags/{id}/dismiss ────────────────────────────────────────

@app.post("/distress-flags/{flag_id}/dismiss")
def dismiss_flag(flag_id: int, db: Session = Depends(get_db)):
    flag = db.query(DistressFlag).filter_by(id=flag_id).first()
    if not flag:
        raise HTTPException(status_code=404, detail="Flag not found")
    flag.status = "dismissed"
    flag.reviewed_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"status": "dismissed"}


# ── GET /tickets/{id}/messages ───────────────────────────────────────────────

@app.get("/tickets/{ticket_id}/messages")
def get_ticket_messages(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter_by(id=ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    messages = (
        db.query(TicketMessage)
        .filter_by(ticket_id=ticket_id)
        .order_by(TicketMessage.created_at)
        .all()
    )
    if not messages and ticket.resolution:
        return [{"id": 0, "sender": "ai", "content": ticket.resolution,
                 "created_at": _utc_iso(ticket.created_at)}]
    if not messages:
        return [{
            "id": 0,
            "sender": "system",
            "content": "MESA has received this ticket. No automated resolution is available yet; add a reply if you can provide more detail.",
            "created_at": _utc_iso(ticket.created_at),
        }]
    return [_serialize_message(m) for m in messages]


# ── POST /tickets/{id}/messages ───────────────────────────────────────────────

class MessageCreate(BaseModel):
    content: str


@app.post("/tickets/{ticket_id}/messages")
def post_ticket_message(ticket_id: int, payload: MessageCreate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter_by(id=ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status in ("resolved", "auto_resolved"):
        raise HTTPException(status_code=400, detail="Ticket is already resolved")

    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

    user_msg = TicketMessage(ticket_id=ticket_id, sender="user", content=payload.content)
    db.add(user_msg)
    db.flush()

    history = [
        {"sender": m.sender, "content": m.content}
        for m in db.query(TicketMessage)
        .filter_by(ticket_id=ticket_id)
        .order_by(TicketMessage.created_at)
        .all()
    ]

    ai_result = generate_thread_response(ticket.text, history[:-1], payload.content)

    ai_msg = TicketMessage(ticket_id=ticket_id, sender="ai", content=ai_result["response"])
    db.add(ai_msg)

    ticket.last_activity = now
    escalated = False

    if ai_result["escalate"] and ticket.status not in ("escalated", "resolved", "auto_resolved"):
        ticket.status = "escalated"
        escalated = True
        system_msg = TicketMessage(
            ticket_id=ticket_id,
            sender="system",
            content="Your ticket has been escalated to IT staff. A team member will respond shortly.",
        )
        db.add(system_msg)
        db.commit()
        if IT_TEAM_EMAIL:
            result = send_email(
                to_addr=IT_TEAM_EMAIL,
                subject=f"MESA: Ticket #{ticket_id} escalated — needs IT attention",
                body=(
                    f"A support ticket has been escalated after the AI could not resolve it.\n\n"
                    f"Ticket #{ticket_id}\n"
                    f"System: {ticket.system_affected}\n"
                    f"Original issue: {ticket.text[:300]}\n\n"
                    f"Last user message: {payload.content}\n\n"
                    f"View thread in MESA admin: http://localhost:5173/admin/escalated"
                ),
            )
            log = EmailLog(
                to_addr=IT_TEAM_EMAIL,
                subject=f"Escalation: ticket #{ticket_id}",
                success=result["success"],
                error_msg=result.get("error"),
            )
            db.add(log)
            db.commit()
    else:
        ticket.status = "ai_responded"
        db.commit()

    return {
        "ai_response": ai_result["response"],
        "escalated": escalated,
        "ticket_status": ticket.status,
    }


# ── POST /tickets/{id}/resolve ────────────────────────────────────────────────

@app.post("/tickets/{ticket_id}/resolve")
def resolve_ticket(ticket_id: int, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter_by(id=ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    ticket.status = "resolved"
    ticket.last_activity = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"status": "resolved"}


# ── GET /admin/escalated-threads ─────────────────────────────────────────────

@app.get("/admin/escalated-threads")
def list_escalated_threads(db: Session = Depends(get_db)):
    tickets = (
        db.query(Ticket)
        .filter_by(status="escalated")
        .order_by(Ticket.last_activity.desc())
        .all()
    )
    result = []
    for t in tickets:
        messages = (
            db.query(TicketMessage)
            .filter_by(ticket_id=t.id)
            .order_by(TicketMessage.created_at)
            .all()
        )
        if not messages and t.resolution:
            msgs = [{"id": 0, "sender": "ai", "content": t.resolution,
                     "created_at": _utc_iso(t.created_at)}]
        else:
            msgs = [_serialize_message(m) for m in messages]
        result.append({
            "id": t.id,
            "text": t.text[:120],
            "system_affected": t.system_affected,
            "severity": t.severity,
            "status": t.status,
            "last_activity": _utc_iso(t.last_activity),
            "created_at": _utc_iso(t.created_at),
            "messages": msgs,
        })
    return result


# ── POST /admin/tickets/{id}/reply ────────────────────────────────────────────

@app.post("/admin/tickets/{ticket_id}/reply")
def admin_reply(ticket_id: int, payload: MessageCreate, db: Session = Depends(get_db)):
    ticket = db.query(Ticket).filter_by(id=ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    msg = TicketMessage(ticket_id=ticket_id, sender="staff", content=payload.content)
    db.add(msg)
    ticket.last_activity = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    db.commit()
    return {"status": "sent"}


# ── GET /config ───────────────────────────────────────────────────────────────

@app.get("/config")
def get_config():
    return {"cluster_threshold": CLUSTER_THRESHOLD}


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
        "timestamp": _utc_iso(datetime.datetime.now(datetime.timezone.utc)),
    }
