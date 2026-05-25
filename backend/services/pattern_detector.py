import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import TicketTag, Cluster, EmailLog, Ticket
from backend.config import CLUSTER_THRESHOLD, IT_TEAM_EMAIL
from backend.services.email_service import send_email


DICT_ELIGIBLE_TOPICS = [
    "Data Pipeline Failure",
    "Reporting Analytics",
    "Payroll Data Issue",
    "Grade Sync Failure",
    "System Integration"
]


def run_pattern_detection(db: Session, threshold: int | None = None) -> list:
    """
    Groups ACTIVE ticket_tags by (system, topic), updates cluster states.
    States: active, healed, relapsed
    """
    if threshold is None:
        threshold = CLUSTER_THRESHOLD

    # Current Active counts
    rows = (
        db.query(
            TicketTag.system,
            TicketTag.topic,
            func.count(TicketTag.id).label("cnt"),
        )
        .join(Ticket, Ticket.id == TicketTag.ticket_id)
        .filter(
            TicketTag.system.isnot(None), 
            TicketTag.topic.isnot(None),
            Ticket.status.notin_(["resolved", "auto_resolved"])
        )
        .group_by(TicketTag.system, TicketTag.topic)
        .all()
    )

    newly_triggered = []
    processed_keys = []
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)

    for system, topic, cnt in rows:
        processed_keys.append((system, topic))
        cluster = db.query(Cluster).filter_by(system=system, topic=topic).first()
        
        if cluster:
            # RELAPSE LOGIC: If it was healed but now has active tickets again
            if cluster.state == "healed" and cnt > 0:
                cluster.state = "relapsed"
                # Trigger second notification if threshold hit again
                if cnt >= threshold:
                    cluster.agent2_triggered = False # Allow re-trigger
            
            cluster.count = cnt
            cluster.last_seen = now
        else:
            cluster = Cluster(topic=topic, system=system, count=cnt, state="active", last_seen=now)
            db.add(cluster)
            db.flush()

        cluster.dict_eligible = topic in DICT_ELIGIBLE_TOPICS

        # AUTONOMOUS TRIGGER LOGIC
        if cnt >= threshold and not cluster.agent2_triggered and cluster.dict_eligible:
            cluster.threshold_hit = True
            cluster.agent2_triggered = True
            newly_triggered.append({"system": system, "topic": topic, "count": cnt})

            steward_email = IT_TEAM_EMAIL or "steward@mines.edu"
            subject = f"MESA {'RELAPSE' if cluster.state == 'relapsed' else 'Autonomous'} Alert: Schema Audit Required for {system}"
            body = (
                f"MESA has detected a recurring cluster of {cnt} user complaints regarding '{topic}' in the {system} platform.\n\n"
                f"Status: {cluster.state.upper()}\n\n"
                f"Because this is classified as a data-related topic, an automated schema audit has been initiated.\n\n"
                f"Please upload the latest dataset here: http://localhost:5173/portal/schema?system={system}&cluster={cluster.id}\n\n"
                f"This audit is powered by local AI inference."
            )
            
            result = send_email(to_addr=steward_email, subject=subject, body=body)
            log = EmailLog(to_addr=steward_email, subject=f"Auto-trigger: {system}/{topic}", success=result["success"], error_msg=result.get("error"))
            db.add(log)
        
        elif cnt >= threshold and not cluster.threshold_hit:
            cluster.threshold_hit = True
            newly_triggered.append({"system": system, "topic": topic, "count": cnt})

    # HEALING LOGIC: If a cluster exists but no longer has active tickets
    all_clusters = db.query(Cluster).all()
    for c in all_clusters:
        if (c.system, c.topic) not in processed_keys:
            # No active tickets found for this system/topic
            if c.state != "healed":
                c.state = "healed"
                c.count = 0
                c.healed_at = now
                c.threshold_hit = False
                # c.agent2_triggered remains True to prevent immediate re-email if tickets fluctuate

    db.commit()
    return newly_triggered
