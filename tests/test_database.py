import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import (
    Base, Ticket, TicketTag, Cluster, DictJob, DistressFlag, EmailLog
)


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
