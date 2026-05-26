import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database import Base, Ticket, TicketTag, Cluster, ClusterEvent
from backend.services.pattern_detector import run_pattern_detection


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def seed_tickets(db, system, topic, count, status=None):
    for i in range(count):
        t = Ticket(
            text=f"ticket {i} for {system}",
            category="other",
            system_affected=system,
            severity="low",
            auto_resolved=False,
            status=status or "ai_responded",
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


# ── existing tests (unchanged behavior) ───────────────────────────────────────

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
    triggered_second = run_pattern_detection(db, threshold=5)
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


# ── new tests for healed/reactivation logic ───────────────────────────────────

def _resolve_all_tickets(db, system):
    """Helper: mark all tickets for a system as explicitly resolved."""
    for t in db.query(Ticket).filter(Ticket.system_affected == system).all():
        t.status = "resolved"
    db.commit()


def _auto_resolve_all_tickets(db, system):
    """Helper: mark all tickets for a system as auto_resolved."""
    for t in db.query(Ticket).filter(Ticket.system_affected == system).all():
        t.status = "auto_resolved"
    db.commit()


def test_non_dict_cluster_heals_on_explicit_resolved(db):
    # Phase 1: active tickets → cluster created
    seed_tickets(db, "Banner", "Password Reset", 3)
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Banner").first()
    assert cluster is not None
    assert cluster.state == "active"

    # Phase 2: explicitly resolve all → cluster should heal
    _resolve_all_tickets(db, "Banner")
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Banner").first()
    assert cluster.state == "healed"
    assert cluster.count == 0


def test_non_dict_cluster_does_not_heal_on_auto_resolved_only(db):
    # Phase 1: active tickets → cluster created
    seed_tickets(db, "Banner", "Password Reset", 3)
    run_pattern_detection(db, threshold=5)

    # Phase 2: auto-resolve all (not explicit resolve) → cluster stays active
    _auto_resolve_all_tickets(db, "Banner")
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Banner").first()
    assert cluster.state == "active"  # auto_resolved alone does not satisfy heal condition


def test_healed_cluster_reactivates_to_active_not_relapsed(db):
    # Phase 1: create + heal
    seed_tickets(db, "Canvas", "Login Failure", 3)
    run_pattern_detection(db, threshold=5)
    _resolve_all_tickets(db, "Canvas")
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Canvas").first()
    assert cluster.state == "healed"

    # Phase 2: new active tickets arrive
    seed_tickets(db, "Canvas", "Login Failure", 2)
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Canvas", topic="Login Failure").first()
    assert cluster.state == "active"
    assert cluster.state != "relapsed"  # relapsed state no longer exists


def test_reactivation_resets_threshold_hit_for_new_cycle(db):
    # Phase 1: create + heal
    seed_tickets(db, "Canvas", "Login Failure", 3)
    run_pattern_detection(db, threshold=5)
    _resolve_all_tickets(db, "Canvas")
    run_pattern_detection(db, threshold=5)

    # Phase 2: reactivate with 2 tickets (below threshold)
    seed_tickets(db, "Canvas", "Login Failure", 2)
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Canvas", topic="Login Failure").first()
    assert cluster.threshold_hit is False  # new cycle, threshold not yet reached


def test_activated_event_logged_on_new_cluster(db):
    seed_tickets(db, "Workday", "Payroll Data Issue", 2)
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Workday").first()
    events = db.query(ClusterEvent).filter_by(cluster_id=cluster.id, event_type="activated").all()
    assert len(events) == 1


def test_threshold_hit_event_logged(db):
    seed_tickets(db, "Banner", "Auth Issues", 5)
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Banner").first()
    events = db.query(ClusterEvent).filter_by(cluster_id=cluster.id, event_type="threshold_hit").all()
    assert len(events) == 1
    assert events[0].ticket_count == 5


def test_healed_event_logged(db):
    seed_tickets(db, "Canvas", "Login Failure", 3)
    run_pattern_detection(db, threshold=5)
    _resolve_all_tickets(db, "Canvas")
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Canvas").first()
    events = db.query(ClusterEvent).filter_by(cluster_id=cluster.id, event_type="healed").all()
    assert len(events) == 1


def test_reactivated_event_logged(db):
    # Phase 1: create + heal
    seed_tickets(db, "Canvas", "Login Failure", 3)
    run_pattern_detection(db, threshold=5)
    _resolve_all_tickets(db, "Canvas")
    run_pattern_detection(db, threshold=5)

    # Phase 2: new active tickets
    seed_tickets(db, "Canvas", "Login Failure", 1)
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Canvas", topic="Login Failure").first()
    events = db.query(ClusterEvent).filter_by(cluster_id=cluster.id, event_type="reactivated").all()
    assert len(events) == 1


def test_total_count_accumulates(db):
    seed_tickets(db, "Banner", "Auth Issues", 3)
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Banner").first()
    assert cluster.total_count == 3

    # Add more tickets
    seed_tickets(db, "Banner", "Auth Issues", 2)
    run_pattern_detection(db, threshold=5)
    cluster = db.query(Cluster).filter_by(system="Banner").first()
    assert cluster.total_count == 5
