import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_get_tickets(client):
    resp = client.get("/tickets")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_get_clusters(client):
    resp = client.get("/clusters")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    # Seeded tickets should have created clusters
    assert len(data) > 0


def test_get_dashboard_stats(client):
    resp = client.get("/dashboard-stats")
    assert resp.status_code == 200
    data = resp.json()
    assert "auto_resolution_rate" in data


def test_post_ticket_mock_gemini(client):
    mock_result = {
        "category": "password_reset", "system_affected": "Banner",
        "severity": "low", "tier": 1, "auto_resolved": True,
        "resolution": "Reset your password at mines.edu/password",
        "confidence": 0.92, "topic": "Authentication Issues", "error_type": "password_reset",
    }
    with patch("backend.main.classify_ticket", return_value=mock_result):
        resp = client.post("/tickets", json={"text": "I forgot my Banner password"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["classification"]["auto_resolved"] is True


def test_system_health(client):
    resp = client.get("/system-health")
    assert resp.status_code == 200
    data = resp.json()
    assert "ollama" in data
    assert "scheduler" in data
