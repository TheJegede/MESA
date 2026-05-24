import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import (
    Base, Ticket, TicketTag, Cluster, DictJob, DistressFlag, EmailLog,
    normalize_unanswered_ticket_statuses, ticket_status_for_resolution
)
import backend.services.scheduler as scheduler_service
from backend.main import get_ticket_messages, notify_it_team


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_all_tables_created(db):
    t = Ticket(
        text="test ticket",
        category="other",
        system_affected="other",
        severity="low",
        auto_resolved=False
    )
    db.add(t)
    db.flush()
    tag = TicketTag(ticket_id=t.id, topic="test", system="other", error_type="unknown")
    db.add(tag)
    db.commit()
    assert db.query(Ticket).count() == 1
    assert db.query(TicketTag).count() == 1


def test_distress_flag_fields(db):
    import json
    flag = DistressFlag(
        student_id="STU-001",
        risk_score=85,
        risk_level="critical",
        risk_factors=json.dumps(["No logins in 10 days"]),
        recommended_action="Contact immediately",
        status="pending",
    )
    db.add(flag)
    db.commit()
    f = db.query(DistressFlag).first()
    assert f.student_id == "STU-001"
    assert f.risk_score == 85
    assert f.status == "pending"


def test_cluster_defaults(db):
    c = Cluster(topic="Test cluster", system="Edify")
    db.add(c)
    db.commit()
    result = db.query(Cluster).first()
    assert result.threshold_hit is False
    assert result.agent2_triggered is False
    assert result.dict_eligible is False
    assert result.count == 0


def test_ticket_status_for_resolution():
    assert ticket_status_for_resolution("Try resetting your password.") == "ai_responded"
    assert ticket_status_for_resolution(None) == "open"
    assert ticket_status_for_resolution("") == "open"


def test_normalize_unanswered_ticket_statuses_marks_empty_ai_response_open(db):
    ticket = Ticket(
        text="No answer was generated",
        status="ai_responded",
        resolution=None,
        auto_resolved=False,
    )
    db.add(ticket)
    db.commit()

    normalize_unanswered_ticket_statuses(db)

    db.refresh(ticket)
    assert ticket.status == "open"


def test_normalize_unanswered_ticket_statuses_keeps_answered_ticket_ai_responded(db):
    ticket = Ticket(
        text="Answer was generated",
        status="ai_responded",
        resolution="Follow these steps.",
        auto_resolved=False,
    )
    db.add(ticket)
    db.commit()

    normalize_unanswered_ticket_statuses(db)

    db.refresh(ticket)
    assert ticket.status == "ai_responded"


def test_get_ticket_messages_returns_system_placeholder_for_unanswered_ticket(db):
    ticket = Ticket(text="No thread yet", status="open", resolution=None)
    db.add(ticket)
    db.commit()

    messages = get_ticket_messages(ticket.id, db)

    assert messages[0]["sender"] == "system"
    assert "No automated resolution is available yet" in messages[0]["content"]


def test_escalation_sweep_does_not_mark_cluster_notified_after_failed_email(monkeypatch):
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)

    db = Session()
    cluster = Cluster(topic="Authentication", system="Banner", count=2, threshold_hit=True, it_notified=False)
    db.add(cluster)
    db.flush()
    for i in range(2):
        ticket = Ticket(text=f"ticket {i}", status="escalated")
        db.add(ticket)
        db.flush()
        db.add(TicketTag(ticket_id=ticket.id, topic="Authentication", system="Banner", error_type="login"))
    db.commit()
    db.close()

    monkeypatch.setattr(scheduler_service, "SessionLocal", Session)
    monkeypatch.setattr(scheduler_service, "IT_TEAM_EMAIL", "it@example.edu")
    monkeypatch.setattr(scheduler_service, "ESCALATION_NOTIFY_THRESHOLD", 2)
    monkeypatch.setattr(
        scheduler_service,
        "send_email",
        lambda *args, **kwargs: {"success": False, "error": "SMTP unavailable"},
    )

    scheduler_service._escalation_notify_sweep()

    db = Session()
    refreshed = db.query(Cluster).one()
    log = db.query(EmailLog).one()
    assert refreshed.it_notified is False
    assert log.success is False
    assert log.error_msg == "SMTP unavailable"
    db.close()


def test_escalation_sweep_marks_cluster_notified_after_successful_email(monkeypatch):
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)

    db = Session()
    cluster = Cluster(topic="Authentication", system="Banner", count=2, threshold_hit=True, it_notified=False)
    db.add(cluster)
    db.flush()
    for i in range(2):
        ticket = Ticket(text=f"ticket {i}", status="escalated")
        db.add(ticket)
        db.flush()
        db.add(TicketTag(ticket_id=ticket.id, topic="Authentication", system="Banner", error_type="login"))
    db.commit()
    db.close()

    monkeypatch.setattr(scheduler_service, "SessionLocal", Session)
    monkeypatch.setattr(scheduler_service, "IT_TEAM_EMAIL", "it@example.edu")
    monkeypatch.setattr(scheduler_service, "ESCALATION_NOTIFY_THRESHOLD", 2)
    monkeypatch.setattr(
        scheduler_service,
        "send_email",
        lambda *args, **kwargs: {"success": True, "error": None},
    )

    scheduler_service._escalation_notify_sweep()

    db = Session()
    refreshed = db.query(Cluster).one()
    log = db.query(EmailLog).one()
    assert refreshed.it_notified is True
    assert log.success is True
    db.close()


def test_manual_notify_does_not_mark_cluster_notified_after_failed_email(db, monkeypatch):
    cluster = Cluster(topic="Authentication", system="Banner", count=5, threshold_hit=True, it_notified=False)
    db.add(cluster)
    db.commit()

    monkeypatch.setattr("backend.main.IT_TEAM_EMAIL", "it@example.edu")
    monkeypatch.setattr(
        "backend.main.send_email",
        lambda *args, **kwargs: {"success": False, "error": "SMTP unavailable"},
    )

    result = notify_it_team(cluster.id, db)

    db.refresh(cluster)
    assert result == {"status": "notified", "success": False}
    assert cluster.it_notified is False
