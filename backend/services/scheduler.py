import datetime
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from backend.database import SessionLocal, Ticket
from backend.agents.agent3_distress import scan_students

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


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(_distress_sweep, "interval", seconds=60, id="distress_sweep", replace_existing=True)
        scheduler.add_job(_auto_resolve_sweep, "interval", seconds=60, id="auto_resolve_sweep", replace_existing=True)
        scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
