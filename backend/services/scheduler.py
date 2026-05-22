import logging
from apscheduler.schedulers.background import BackgroundScheduler
from backend.database import SessionLocal
from backend.agents.agent3_distress import scan_students

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def _distress_sweep():
    db = SessionLocal()
    try:
        scan_students(db)
    except Exception as e:
        logger.error("Distress sweep failed: %s", e)
    finally:
        db.close()


def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(_distress_sweep, "interval", seconds=60, id="distress_sweep", replace_existing=True)
        scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
