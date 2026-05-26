import datetime
import json
import os
from sqlalchemy import (
    create_engine, Column, Integer, String, Boolean,
    DateTime, Text, ForeignKey, func
)
from sqlalchemy.orm import declarative_base, sessionmaker

from backend.config import BASE_DIR, MOCK_DATA_DIR

DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'mesa.db')}"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=False)
    category = Column(String(50))
    system_affected = Column(String(50))
    severity = Column(String(20))
    auto_resolved = Column(Boolean, default=False)
    resolution = Column(Text)
    status = Column(String(30), default="ai_responded")
    user_email = Column(String(200), nullable=True)
    last_activity = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))


class TicketMessage(Base):
    __tablename__ = "ticket_messages"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    sender = Column(String(20))  # user | ai | staff
    content = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))


class TicketTag(Base):
    __tablename__ = "ticket_tags"
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    topic = Column(String(100))
    system = Column(String(50))
    error_type = Column(String(50))


class Cluster(Base):
    __tablename__ = "clusters"
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String(200))
    system = Column(String(50))
    count = Column(Integer, default=0)
    total_count = Column(Integer, default=0)  # lifetime ticket count, never resets
    last_seen = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    threshold_hit = Column(Boolean, default=False)
    agent2_triggered = Column(Boolean, default=False)
    it_notified = Column(Boolean, default=False)
    dict_eligible = Column(Boolean, default=False)
    state = Column(String(20), default="active")  # active, healed
    healed_at = Column(DateTime)


class ClusterEvent(Base):
    __tablename__ = "cluster_events"
    id = Column(Integer, primary_key=True, index=True)
    cluster_id = Column(Integer, ForeignKey("clusters.id"), nullable=False)
    event_type = Column(String(20), nullable=False)  # activated | threshold_hit | healed | reactivated
    ticket_count = Column(Integer)       # active ticket count at event time
    cumulative_count = Column(Integer)   # lifetime total at event time
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))



class DictJob(Base):
    __tablename__ = "dict_jobs"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(200))
    system = Column(String(50), default="unknown")
    status = Column(String(20), default="queued")
    artifact_path = Column(String(500))
    change_note = Column(Text)
    triggered_by_cluster = Column(String(100))
    faculty_email = Column(String(200))
    entry_count = Column(Integer)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))


class SchemaBaseline(Base):
    __tablename__ = "schema_baselines"
    id = Column(Integer, primary_key=True, index=True)
    system = Column(String(50), unique=True)
    schema_json = Column(Text)  # JSON list of column names
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))


class DistressFlag(Base):
    __tablename__ = "distress_flags"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50))
    risk_score = Column(Integer)
    risk_level = Column(String(20))
    risk_factors = Column(Text)  # JSON list stored as string
    recommended_action = Column(Text)
    report_path = Column(String(500))
    status = Column(String(20), default="pending")
    reviewed_at = Column(DateTime)
    created_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))


class EmailLog(Base):
    __tablename__ = "email_log"
    id = Column(Integer, primary_key=True, index=True)
    to_addr = Column(String(200))
    subject = Column(String(500))
    sent_at = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))
    success = Column(Boolean)
    error_msg = Column(Text)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)


def ticket_status_for_resolution(resolution: str | None) -> str:
    return "ai_responded" if resolution else "open"


def normalize_unanswered_ticket_statuses(db):
    tickets = (
        db.query(Ticket)
        .filter((Ticket.status == "ai_responded") | (Ticket.status == None))
        .all()
    )
    if not tickets:
        return

    ticket_ids = [t.id for t in tickets]
    msg_counts = {
        tid: cnt
        for tid, cnt in db.query(TicketMessage.ticket_id, func.count(TicketMessage.id))
        .filter(TicketMessage.ticket_id.in_(ticket_ids))
        .group_by(TicketMessage.ticket_id)
        .all()
    }

    changed = False
    for ticket in tickets:
        if ticket.resolution:
            if not ticket.status:
                ticket.status = "ai_responded"
                changed = True
            continue

        if msg_counts.get(ticket.id, 0) == 0 and ticket.status != "open":
            ticket.status = "open"
            changed = True

    if changed:
        db.commit()


def seed_tickets_if_empty(db):
    if db.query(Ticket).first():
        return
    
    # Seed Edify Baseline — system stored uppercase to match job normalization
    edify_baseline_cols = ["student_id", "first_name", "last_name", "email", "gpa", "major", "enrollment_status", "finance_hold"]
    if not db.query(SchemaBaseline).filter_by(system="EDIFY").first():
        db.add(SchemaBaseline(system="EDIFY", schema_json=json.dumps(edify_baseline_cols)))

    seed_path = os.path.join(MOCK_DATA_DIR, "tickets_seed.json")
    if not os.path.exists(seed_path):
        return
    with open(seed_path, encoding="utf-8") as f:
        data = json.load(f)
    
    now = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    for t in data:
        res = t.get("resolution")
        ticket = Ticket(
            text=t.get("text", ""),
            category=t.get("category", "other"),
            system_affected=t.get("system_affected", "other"),
            severity=t.get("severity", "low"),
            auto_resolved=t.get("auto_resolved", False),
            resolution=res,
            status=ticket_status_for_resolution(res),
            last_activity=now,
            created_at=now,
        )
        db.add(ticket)
        db.flush()

        tag = TicketTag(
            ticket_id=ticket.id,
            topic=t.get("topic", "unclassified"),
            system=t.get("system_affected", "other"),
            error_type=t.get("error_type", "unknown"),
        )
        db.add(tag)

        if res:
            msg = TicketMessage(
                ticket_id=ticket.id,
                sender="ai",
                content=res,
                created_at=now,
            )
            db.add(msg)
    db.commit()
