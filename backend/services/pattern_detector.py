import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import TicketTag, Cluster, ClusterEvent, EmailLog, Ticket
from backend.config import CLUSTER_THRESHOLD, IT_TEAM_EMAIL
from backend.services.email_service import send_email


DICT_ELIGIBLE_TOPICS = [
    "Data Pipeline Failure",
    "Reporting Analytics",
    "Payroll Data Issue",
    "Grade Sync Failure",
    "System Integration"
]


def _log_event(db: Session, cluster_id: int, event_type: str,
               ticket_count: int, cumulative_count: int,
               now: datetime.datetime) -> None:
    db.add(ClusterEvent(
        cluster_id=cluster_id,
        event_type=event_type,
        ticket_count=ticket_count,
        cumulative_count=cumulative_count,
        created_at=now,
    ))


def run_pattern_detection(db: Session, threshold: int | None = None) -> list:
    """
    Groups active ticket_tags by (system, topic), updates cluster states.

    State machine: active <-> healed  (no relapsed state)
    - Reactivation: healed cluster gains new active tickets -> back to active
    - Non-dict heal: zero active tickets AND at least one explicitly resolved ticket
    - Dict-eligible heal: only via _process_dict_job completion (never here)
    - Threshold re-fires only after a full heal/reactivate cycle
    """
    if threshold is None:
        threshold = CLUSTER_THRESHOLD

    # Active = not yet resolved or auto_resolved
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

        # Lifetime count: all tickets for this (system, topic) regardless of status
        total = db.query(func.count(Ticket.id)).join(
            TicketTag, Ticket.id == TicketTag.ticket_id
        ).filter(
            TicketTag.system == system,
            TicketTag.topic == topic
        ).scalar() or 0

        cluster = db.query(Cluster).filter_by(system=system, topic=topic).first()

        if cluster:
            if cluster.state == "healed" and cnt > 0:
                # Reactivation: previously healed, new tickets appeared
                cluster.state = "active"
                cluster.threshold_hit = False
                cluster.agent2_triggered = False  # allow re-trigger in new cycle
                _log_event(db, cluster.id, "reactivated", cnt, total, now)

            cluster.count = cnt
            cluster.last_seen = now
            cluster.total_count = total
        else:
            cluster = Cluster(
                topic=topic,
                system=system,
                count=cnt,
                state="active",
                last_seen=now,
                total_count=total,
            )
            db.add(cluster)
            db.flush()
            _log_event(db, cluster.id, "activated", cnt, total, now)

        cluster.dict_eligible = topic in DICT_ELIGIBLE_TOPICS

        # Autonomous trigger for dict-eligible clusters
        if cnt >= threshold and not cluster.agent2_triggered and cluster.dict_eligible:
            cluster.threshold_hit = True
            cluster.agent2_triggered = True
            newly_triggered.append({"system": system, "topic": topic, "count": cnt})
            _log_event(db, cluster.id, "threshold_hit", cnt, total, now)

            is_recurrence = cluster.healed_at is not None
            label = "Recurring" if is_recurrence else "Autonomous"
            steward_email = IT_TEAM_EMAIL or "steward@mines.edu"
            subject = f"MESA {label} Alert: Schema Audit Required for {system}"
            body = (
                f"MESA has detected {'a recurring' if is_recurrence else 'a'} cluster of {cnt} "
                f"user complaints regarding '{topic}' in the {system} platform.\n\n"
                f"Because this is classified as a data-related topic, an automated schema audit "
                f"has been initiated.\n\n"
                f"Please upload the latest dataset here: "
                f"http://localhost:5173/portal/schema?system={system}&cluster={cluster.id}\n\n"
                f"This audit is powered by local AI inference."
            )
            result = send_email(to_addr=steward_email, subject=subject, body=body)
            db.add(EmailLog(
                to_addr=steward_email,
                subject=f"Auto-trigger: {system}/{topic}",
                success=result["success"],
                error_msg=result.get("error"),
            ))

        elif cnt >= threshold and not cluster.threshold_hit:
            # Non-dict cluster above threshold
            cluster.threshold_hit = True
            newly_triggered.append({"system": system, "topic": topic, "count": cnt})
            _log_event(db, cluster.id, "threshold_hit", cnt, total, now)

    # Healing check: clusters with no active tickets
    all_clusters = db.query(Cluster).all()
    for c in all_clusters:
        if (c.system, c.topic) in processed_keys:
            continue  # still has active tickets
        if c.state == "healed":
            continue  # already healed
        if c.dict_eligible:
            # dict-eligible clusters heal only when _process_dict_job completes
            continue

        # Non-dict: heal requires at least one explicitly user-resolved ticket
        resolved_exists = (
            db.query(Ticket)
            .join(TicketTag, Ticket.id == TicketTag.ticket_id)
            .filter(
                TicketTag.system == c.system,
                TicketTag.topic == c.topic,
                Ticket.status == "resolved",
            )
            .first()
        )
        if resolved_exists:
            c.state = "healed"
            c.count = 0
            c.healed_at = now
            c.threshold_hit = False
            _log_event(db, c.id, "healed", 0, c.total_count or 0, now)

    db.commit()
    return newly_triggered
