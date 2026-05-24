import datetime
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from backend.database import SessionLocal, Ticket, TicketTag, Cluster, EmailLog
from backend.agents.agent3_distress import scan_students
from backend.services.email_service import send_email
from backend.config import IT_TEAM_EMAIL, ESCALATION_NOTIFY_THRESHOLD

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

AUTO_RESOLVE_MINUTES = 10


def _distress_sweep():
    db = SessionLocal()
    try:
        scan_students(db)
    except Exception as e:
        logger.error("Distress sweep failed: %s", e)
    finally:
        db.close()


def _auto_resolve_sweep():
    db = SessionLocal()
    try:
        cutoff = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) - datetime.timedelta(minutes=AUTO_RESOLVE_MINUTES)
        stale = (
            db.query(Ticket)
            .filter(
                Ticket.status == "ai_responded",
                Ticket.last_activity.isnot(None),
                Ticket.last_activity < cutoff,
            )
            .all()
        )
        for ticket in stale:
            ticket.status = "auto_resolved"
            ticket.auto_resolved = True
            logger.info("Auto-resolved ticket #%d (inactive >%dm)", ticket.id, AUTO_RESOLVE_MINUTES)
        if stale:
            db.commit()
    except Exception as e:
        logger.error("Auto-resolve sweep failed: %s", e)
    finally:
        db.close()


def _escalation_notify_sweep():
    db = SessionLocal()
    try:
        clusters = (
            db.query(Cluster)
            .filter(Cluster.it_notified == False, Cluster.threshold_hit == True)
            .all()
        )
        for cluster in clusters:
            escalated_count = (
                db.query(Ticket)
                .join(TicketTag, Ticket.id == TicketTag.ticket_id)
                .filter(
                    Ticket.status == "escalated",
                    TicketTag.system == cluster.system,
                    TicketTag.topic == cluster.topic,
                )
                .count()
            )
            if escalated_count >= ESCALATION_NOTIFY_THRESHOLD:
                if not IT_TEAM_EMAIL:
                    logger.warning(
                        "Skipping IT notification for cluster %s/%s: IT_TEAM_EMAIL not configured",
                        cluster.system,
                        cluster.topic,
                    )
                    continue

                subject = f"[MESA] IT Alert: {escalated_count} escalated tickets — {cluster.system} / {cluster.topic}"
                body = (
                    f"MESA has detected {escalated_count} escalated ticket(s) requiring IT attention.\n\n"
                    f"  System:  {cluster.system}\n"
                    f"  Topic:   {cluster.topic}\n"
                    f"  Total tickets in cluster: {cluster.count}\n\n"
                    f"These tickets were escalated after AI resolution failed to resolve the issue. "
                    f"Please review and assign staff.\n\n"
                    f"View in admin panel: http://localhost:5173/admin/escalated\n\n"
                    f"— MESA Automated Alert"
                )
                result = send_email(IT_TEAM_EMAIL, subject, body)
                log = EmailLog(
                    to_addr=IT_TEAM_EMAIL,
                    subject=subject,
                    sent_at=datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None),
                    success=result["success"],
                    error_msg=result.get("error"),
                )
                db.add(log)
                if result["success"]:
                    cluster.it_notified = True
                db.commit()
                if result["success"]:
                    logger.info(
                        "IT notified for cluster %s/%s (%d escalations)",
                        cluster.system, cluster.topic, escalated_count,
                    )
                else:
                    logger.warning(
                        "IT notification failed for cluster %s/%s (%d escalations): %s",
                        cluster.system, cluster.topic, escalated_count, result.get("error"),
                    )
    except Exception as e:
        logger.error("Escalation notify sweep failed: %s", e)
    finally:
        db.close()


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(_distress_sweep, "interval", seconds=60, id="distress_sweep", replace_existing=True)
        scheduler.add_job(_auto_resolve_sweep, "interval", seconds=60, id="auto_resolve_sweep", replace_existing=True)
        scheduler.add_job(_escalation_notify_sweep, "interval", seconds=60, id="escalation_notify_sweep", replace_existing=True)
        scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
