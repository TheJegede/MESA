import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.database import TicketTag, Cluster
from backend.config import CLUSTER_THRESHOLD


def run_pattern_detection(db: Session, threshold: int = None) -> list:
    """
    Groups ticket_tags by system, updates cluster counts, flags threshold hits.
    Returns list of newly-triggered cluster dicts: [{system, topic, count}]
    Only returns clusters newly crossing the threshold on this call —
    clusters already marked threshold_hit=True are excluded.
    """
    if threshold is None:
        threshold = CLUSTER_THRESHOLD

    rows = (
        db.query(
            TicketTag.system,
            TicketTag.topic,
            func.count(TicketTag.id).label("cnt"),
        )
        .group_by(TicketTag.system, TicketTag.topic)
        .all()
    )

    newly_triggered = []

    for system, topic, cnt in rows:
        cluster = db.query(Cluster).filter_by(system=system, topic=topic).first()
        if cluster:
            cluster.count = cnt
            cluster.last_seen = datetime.datetime.now(datetime.timezone.utc)
        else:
            cluster = Cluster(topic=topic, system=system, count=cnt)
            db.add(cluster)
        db.flush()

        if cnt >= threshold and not cluster.threshold_hit:
            cluster.threshold_hit = True
            newly_triggered.append({"system": system, "topic": topic, "count": cnt})

    db.commit()
    return newly_triggered
