import csv
import logging
import os
import json
import uuid
import datetime
import shutil
import socket
from contextlib import asynccontextmanager
from typing import Optional

from alembic.config import Config as AlembicConfig
from alembic import command as alembic_command

logger = logging.getLogger(__name__)

import ollama
from fastapi import BackgroundTasks, FastAPI, Depends, Form, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database import (
    get_db, init_db, normalize_unanswered_ticket_statuses, seed_tickets_if_empty, SessionLocal,
    ticket_status_for_resolution,
    Ticket, TicketTag, TicketMessage, Cluster, ClusterEvent, DictJob, DistressFlag, EmailLog,
    SchemaBaseline
)
from backend.config import BASE_DIR, CLUSTER_THRESHOLD, GMAIL_USER, ADVISOR_EMAIL, UPLOADS_DIR, IT_TEAM_EMAIL
from backend.agents.agent1_helpdesk import classify_ticket
from backend.agents.agent2_dictionary import generate_dictionary_confirmed, scan_schema_for_ferpa, get_schema_columns
from backend.agents.agent4_conversation import generate_thread_response
from backend.services.rag_service import load_knowledge_base
from backend.services.email_service import send_email, send_with_attachment
from backend.services.pattern_detector import run_pattern_detection
from backend.services.scheduler import start_scheduler, stop_scheduler, scheduler

def _process_dict_job(job_id: int, file_path: str, faculty_email: str, filename: str, system: str):
    system = system.upper()
    db = SessionLocal()
    job = None
    try:
        job = db.query(DictJob).filter_by(id=job_id).first()
        if job:
            job.status = "processing"
            db.commit()

        # Fetch baseline
        baseline = db.query(SchemaBaseline).filter_by(system=system).first()
        baseline_cols = json.loads(baseline.schema_json) if baseline else None

        result = generate_dictionary_confirmed(file_path, baseline_columns=baseline_cols)

        if result.get("error"):
            if job:
                job.status = "failed"
                job.change_note = f"ERROR: {result['error']}"
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
            job.change_note = result.get("change_note")
            db.commit()

            # CLOSE THE LOOP: Auto-resolve tickets in the triggering cluster
            if job.triggered_by_cluster and job.triggered_by_cluster.startswith("Cluster #"):
                try:
                    cluster_id = int(job.triggered_by_cluster.replace("Cluster #", ""))
                    cluster = db.query(Cluster).filter_by(id=cluster_id).first()
                    if cluster:
                        # Find all tickets linked to this cluster's system/topic
                        tickets = (
                            db.query(Ticket)
                            .join(TicketTag, Ticket.id == TicketTag.ticket_id)
                            .filter(TicketTag.system == cluster.system, TicketTag.topic == cluster.topic)
                            .all()
                        )
                        for t in tickets:
                            if t.status not in ("resolved", "auto_resolved"):
                                t.status = "auto_resolved"
                                closure_msg = TicketMessage(
                                    ticket_id=t.id,
                                    sender="system",
                                    content=(
                                        f"AUTO-RESOLVED: A system schema audit for {cluster.system} has been completed. "
                                        "The diagnostic gap identified by this ticket has been healed via Agent 2 analysis."
                                    )
                                )
                                db.add(closure_msg)

                        cluster.agent2_triggered = False
                        cluster.threshold_hit = False
                        cluster.state = "healed"
                        cluster.healed_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
                        db.add(ClusterEvent(
                            cluster_id=cluster.id,
                            event_type="healed",
                            ticket_count=0,
                            cumulative_count=cluster.total_count or 0,
                            created_at=cluster.healed_at,
                        ))
                        db.commit()
                except Exception as loop_err:
                    logger.error("Self-healing loop failed for job %d: %s", job_id, loop_err)

        # Priority Alert: Breaking Change detected
        if result.get("has_removals") and IT_TEAM_EMAIL:
            send_email(
                to_addr=IT_TEAM_EMAIL,
                subject=f"PRIORITY ALERT: Breaking Schema Change in {system}",
                body=(
                    f"Agent 2 has detected one or more REMOVED columns in the '{system}' schema upload.\n\n"
                    f"Impact Analysis:\n{result.get('change_note')}\n\n"
                    f"View detailed report in MESA Admin: http://localhost:5173/admin/artifacts"
                )
            )

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
    try:
        ollama.chat(
            model="llama3.1:8b",
            messages=[{"role": "user", "content": "ping"}],
            options={"num_predict": 1},
            keep_alive=-1,
        )
        logger.info("Ollama warmed up")
    except Exception as e:
        logger.warning("Ollama warmup failed (non-fatal): %s", e)
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
    user_email: str


# ── POST /tickets ────────────────────────────────────────────────────────────

@app.post("/tickets")
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db)):
    classification = classify_ticket(payload.text)

    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    
    # Logic: if tier 2 or not auto_resolved, it's escalated or open
    # But classification usually provides an "escalation message" as resolution
    auto_resolved = classification.get("auto_resolved", False)
    res_text = classification.get("resolution")
    
    if not auto_resolved and classification.get("tier") == 2:
        status = "escalated"
    else:
        status = ticket_status_for_resolution(res_text)

    ticket = Ticket(
        text=payload.text,
        category=classification.get("category", "other"),
        system_affected=classification.get("system_affected", "other"),
        severity=classification.get("severity", "medium"),
        auto_resolved=auto_resolved,
        resolution=res_text,
        status=status,
        user_email=payload.user_email or None,
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

    if res_text:
        first_msg = TicketMessage(
            ticket_id=ticket.id,
            sender="ai",
            content=res_text,
        )
        db.add(first_msg)
        
        # If it was escalated at birth, add a system message too for clarity in thread
        if status == "escalated":
            sys_msg = TicketMessage(
                ticket_id=ticket.id,
                sender="system",
                content="This issue has been escalated to IT staff for further review.",
            )
            db.add(sys_msg)

    db.commit()

    if payload.user_email and res_text:
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
def list_tickets(user_email: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Ticket)
    if user_email:
        q = q.filter(Ticket.user_email == user_email)
    tickets = q.order_by(Ticket.created_at.desc()).all()
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
            "total_count": c.total_count or 0,
            "last_seen": _utc_iso(c.last_seen),
            "threshold_hit": c.threshold_hit,
            "agent2_triggered": c.agent2_triggered,
            "dict_eligible": c.dict_eligible,
            "it_notified": c.it_notified,
            "state": c.state or "active",
            "healed_at": _utc_iso(c.healed_at),
        }
        for c in clusters
    ]


# ── GET /clusters/{id}/tickets ────────────────────────────────────────────────

@app.get("/clusters/{cluster_id}/tickets")
def get_cluster_tickets(cluster_id: int, db: Session = Depends(get_db)):
    cluster = db.query(Cluster).filter_by(id=cluster_id).first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    tickets = (
        db.query(Ticket)
        .join(TicketTag, Ticket.id == TicketTag.ticket_id)
        .filter(
            TicketTag.system == cluster.system,
            TicketTag.topic == cluster.topic
        )
        .order_by(Ticket.created_at.desc())
        .all()
    )

    return [
        {
            "id": t.id,
            "text": t.text[:200],
            "category": t.category,
            "system_affected": t.system_affected,
            "severity": t.severity,
            "status": t.status or ticket_status_for_resolution(t.resolution),
            "created_at": _utc_iso(t.created_at),
        }
        for t in tickets
    ]


# ── GET /clusters/{id}/events ────────────────────────────────────────────────

@app.get("/clusters/{cluster_id}/events")
def get_cluster_events(cluster_id: int, db: Session = Depends(get_db)):
    cluster = db.query(Cluster).filter_by(id=cluster_id).first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    events = (
        db.query(ClusterEvent)
        .filter_by(cluster_id=cluster_id)
        .order_by(ClusterEvent.created_at.asc())
        .all()
    )
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "ticket_count": e.ticket_count,
            "cumulative_count": e.cumulative_count,
            "created_at": _utc_iso(e.created_at),
        }
        for e in events
    ]


# ── GET /clusters/history ────────────────────────────────────────────────────

@app.get("/clusters/history")
def get_clusters_history(db: Session = Depends(get_db)):
    clusters = db.query(Cluster).order_by(Cluster.last_seen.desc()).all()
    result = []
    for c in clusters:
        events = (
            db.query(ClusterEvent)
            .filter_by(cluster_id=c.id)
            .order_by(ClusterEvent.created_at.asc())
            .all()
        )
        result.append({
            "id": c.id,
            "system": c.system,
            "topic": c.topic,
            "state": c.state or "active",
            "count": c.count,
            "total_count": c.total_count or 0,
            "threshold_hit": c.threshold_hit,
            "dict_eligible": c.dict_eligible,
            "agent2_triggered": c.agent2_triggered,
            "it_notified": c.it_notified,
            "last_seen": _utc_iso(c.last_seen),
            "healed_at": _utc_iso(c.healed_at),
            "events": [
                {
                    "id": e.id,
                    "event_type": e.event_type,
                    "ticket_count": e.ticket_count,
                    "cumulative_count": e.cumulative_count,
                    "created_at": _utc_iso(e.created_at),
                }
                for e in events
            ],
        })
    return result





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
        "ai_responded": db.query(Ticket).filter_by(status="ai_responded").count(),
        "escalated":    db.query(Ticket).filter_by(status="escalated").count(),
        "resolved":     db.query(Ticket).filter_by(status="resolved").count(),
        "auto_resolved": db.query(Ticket).filter_by(status="auto_resolved").count(),
        "open":         db.query(Ticket).filter_by(status="open").count(),
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
    system: str = Form("unknown"),
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

    # Robust System Inference
    final_system = system.lower() if system and system.lower() != "unknown" else "unknown"
    
    if triggered_by_cluster and final_system == "unknown":
        if triggered_by_cluster.startswith("Cluster #"):
            try:
                c_id = int(triggered_by_cluster.replace("Cluster #", ""))
                cluster = db.query(Cluster).filter_by(id=c_id).first()
                if cluster:
                    final_system = cluster.system.lower()
            except Exception as e:
                logger.warning("System inference from cluster ref failed: %s", e)
        else:
            cluster = db.query(Cluster).filter_by(topic=triggered_by_cluster).first()
            if cluster:
                final_system = cluster.system.lower()

    if final_system == "unknown":
        base = os.path.basename(file.filename).lower()
        for s in ["edify", "banner", "canvas", "workday", "onedrive"]:
            if s in base:
                final_system = s
                break

    job = DictJob(
        filename=file.filename,
        system=final_system.upper(),
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

    background_tasks.add_task(_process_dict_job, job.id, upload_path, faculty_email, file.filename, final_system)

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
            "system": j.system,
            "status": j.status,
            "artifact_path": j.artifact_path,
            "change_note": j.change_note,
            "triggered_by_cluster": j.triggered_by_cluster,
            "faculty_email": j.faculty_email,
            "entry_count": j.entry_count,
            "created_at": _utc_iso(j.created_at),
        }
        for j in jobs
    ]


@app.post("/dict-jobs/{job_id}/set-baseline")
def set_baseline(job_id: int, db: Session = Depends(get_db)):
    job = db.query(DictJob).filter_by(id=job_id).first()
    if not job or job.status != "completed":
        raise HTTPException(status_code=400, detail="Job not found or not completed")
    
    if not job.artifact_path or not os.path.exists(job.artifact_path):
        raise HTTPException(status_code=404, detail="Artifact missing")
    
    cols = []
    with open(job.artifact_path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            cols.append(row["field_name"])
    
    baseline = db.query(SchemaBaseline).filter_by(system=job.system).first()
    if baseline:
        baseline.schema_json = json.dumps(cols)
        baseline.created_at = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    else:
        baseline = SchemaBaseline(system=job.system, schema_json=json.dumps(cols))
        db.add(baseline)
    
    db.commit()
    return {"status": "success", "system": job.system, "columns": len(cols)}


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
            f"Your data dictionary for '{job.filename}' has been sent by an administrator.\n\n"
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
    elif ai_result.get("resolved") and ticket.status not in ("resolved", "auto_resolved"):
        ticket.status = "auto_resolved"
        ticket.auto_resolved = True
        system_msg = TicketMessage(
            ticket_id=ticket_id,
            sender="system",
            content="This ticket has been automatically resolved based on your confirmation that the issue is fixed.",
        )
        db.add(system_msg)
        db.commit()
    else:
        ticket.status = "ai_responded"
        db.commit()

    return {
        "ai_response": ai_result["response"],
        "escalated": escalated,
        "resolved": ai_result.get("resolved", False),
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
    if not tickets:
        return []

    ticket_ids = [t.id for t in tickets]
    all_messages = (
        db.query(TicketMessage)
        .filter(TicketMessage.ticket_id.in_(ticket_ids))
        .order_by(TicketMessage.created_at)
        .all()
    )
    msgs_by_ticket: dict = {}
    for m in all_messages:
        msgs_by_ticket.setdefault(m.ticket_id, []).append(m)

    result = []
    for t in tickets:
        raw_msgs = msgs_by_ticket.get(t.id, [])
        if not raw_msgs and t.resolution:
            msgs = [{"id": 0, "sender": "ai", "content": t.resolution,
                     "created_at": _utc_iso(t.created_at)}]
        else:
            msgs = [_serialize_message(m) for m in raw_msgs]
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


# ── GET /email-log ────────────────────────────────────────────────────────────

@app.get("/email-log")
def list_email_log(limit: int = 10, db: Session = Depends(get_db)):
    logs = (
        db.query(EmailLog)
        .order_by(EmailLog.sent_at.desc())
        .limit(max(1, min(limit, 50)))
        .all()
    )
    return [
        {
            "id": l.id,
            "to_addr": l.to_addr,
            "subject": l.subject,
            "sent_at": _utc_iso(l.sent_at),
            "success": l.success,
        }
        for l in logs
    ]


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


# ── DEMO / RESET ─────────────────────────────────────────────────────────────

@app.post("/demo/reset")
def reset_database():
    from backend.database import Base, engine
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    try:
        alembic_cfg = AlembicConfig(os.path.join(BASE_DIR, "alembic.ini"))
        alembic_command.stamp(alembic_cfg, "head")
    except Exception as e:
        logger.warning("Alembic stamp after reset failed: %s", e)

    db = SessionLocal()
    try:
        seed_tickets_if_empty(db)
        normalize_unanswered_ticket_statuses(db)
        run_pattern_detection(db)
    finally:
        db.close()

    return {"status": "reset_complete"}
