import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from ai_backend.main import app

@pytest.fixture(autouse=True)
def mock_ollama():
    with patch("ai_backend.llm.model.OllamaClient.warm_up", new_callable=AsyncMock) as m_warm, \
         patch("ai_backend.llm.model.OllamaClient.generate_analysis", new_callable=AsyncMock) as m_gen:
        m_gen.return_value = {
            "possible_causes": ["Mocked GPS Loss Cause (inferred)"],
            "recommended_action": "Mocked switch to secondary altitude source.",
            "suggested_action_id": "SHOW_BACKUP_ALTITUDE_SOURCE",
            "ai_status": "COMPLETE"
        }
        yield

def test_health_endpoint():
    with TestClient(app) as client:
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert "status" in data
        assert "ollama_reachable" in data

def test_ai_status_endpoint():
    with TestClient(app) as client:
        res = client.get("/ai/status")
        assert res.status_code == 200
        data = res.json()
        assert data["target_model"] == "llama3.2:1b"

def test_post_telemetry_gps_loss_contract():
    payload = {
        "timestamp": "2026-09-21T12:00:00Z",
        "flight_id": "TEST-CONTRACT-01",
        "flight_phase": "ASCENT",
        "gps": {
            "latitude": 0.0,
            "longitude": 0.0,
            "speed": 0.0,
            "fix": False
        }
    }
    with TestClient(app) as client:
        # Send 3 samples to satisfy persistence criteria
        client.post("/telemetry", json=payload)
        client.post("/telemetry", json=payload)
        res = client.post("/telemetry", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "processed"
        alerts = data["alerts_triggered"]
        assert len(alerts) >= 1
        alert = alerts[0]
        assert alert["fault"] == "GPS_LOSS"
        assert alert["ai_status"] == "PENDING"
