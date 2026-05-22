import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base, Ticket, TicketTag, Cluster
from backend.services.pattern_detector import run_pattern_detection


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def seed_tickets(db, system, topic, count):
    for i in range(count):
        t = Ticket(
            text=f"ticket {i} for {system}",
            category="other",
            system_affected=system,
            severity="low",
            auto_resolved=False,
        )
        db.add(t)
        db.flush()
        tag = TicketTag(
            ticket_id=t.id,
            topic=topic,
            system=system,
            error_type="test",
        )
        db.add(tag)
    db.commit()


def test_cluster_created_from_tags(db):
    seed_tickets(db, "Edify", "Data Access & Pipeline Errors", 3)
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Edify").first()
    assert cluster is not None
    assert cluster.count == 3


def test_threshold_triggers(db):
    seed_tickets(db, "Edify", "Data Access & Pipeline Errors", 5)
    triggered = run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Edify").first()
    assert cluster.threshold_hit is True
    assert len(triggered) == 1
    assert triggered[0]["system"] == "Edify"


def test_below_threshold_not_triggered(db):
    seed_tickets(db, "Banner", "Auth Issues", 3)
    triggered = run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Banner").first()
    assert cluster.threshold_hit is False
    assert len(triggered) == 0


def test_already_threshold_hit_not_re_triggered(db):
    seed_tickets(db, "Edify", "Data Access & Pipeline Errors", 6)
    run_pattern_detection(db, threshold=5)
    # First call sets threshold_hit=True
    triggered_second = run_pattern_detection(db, threshold=5)
    # Second call should NOT add to triggered list (already hit)
    assert len(triggered_second) == 0


def test_multiple_systems_tracked(db):
    seed_tickets(db, "Edify", "Data Access", 5)
    seed_tickets(db, "Banner", "Auth", 3)
    run_pattern_detection(db, threshold=5)
    assert db.query(Cluster).count() == 2
    edify = db.query(Cluster).filter_by(system="Edify").first()
    banner = db.query(Cluster).filter_by(system="Banner").first()
    assert edify.threshold_hit is True
    assert banner.threshold_hit is False
