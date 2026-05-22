import datetime
import json
import os
from sqlalchemy import (
    create_engine, Column, Integer, String, Boolean,
    DateTime, Text, ForeignKey
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
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


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
    topic = Column(String(100))
    system = Column(String(50))
    count = Column(Integer, default=0)
    last_seen = Column(DateTime, default=datetime.datetime.utcnow)
    threshold_hit = Column(Boolean, default=False)
    agent2_triggered = Column(Boolean, default=False)


class DictJob(Base):
    __tablename__ = "dict_jobs"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(200))
    status = Column(String(20), default="processing")
    artifact_path = Column(String(500))
    triggered_by_cluster = Column(String(100))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


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
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class EmailLog(Base):
    __tablename__ = "email_log"
    id = Column(Integer, primary_key=True, index=True)
    to_addr = Column(String(200))
    subject = Column(String(500))
    sent_at = Column(DateTime, default=datetime.datetime.utcnow)
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


def seed_tickets_if_empty(db):
    if db.query(Ticket).count() > 0:
        return
    seed_path = os.path.join(MOCK_DATA_DIR, "tickets_seed.json")
    if not os.path.exists(seed_path):
        return  # seed file not created yet
    with open(seed_path, encoding="utf-8") as f:
        data = json.load(f)
    for t in data:
        ticket = Ticket(
            text=t["text"],
            category=t["category"],
            system_affected=t["system_affected"],
            severity=t["severity"],
            auto_resolved=t["auto_resolved"],
            resolution=t.get("resolution"),
        )
        db.add(ticket)
        db.flush()
        tag = TicketTag(
            ticket_id=ticket.id,
            topic=t["topic"],
            system=t["system_affected"],
            error_type=t["error_type"],
        )
        db.add(tag)
    db.commit()
