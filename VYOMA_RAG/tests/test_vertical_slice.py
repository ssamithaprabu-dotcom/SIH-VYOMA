import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from ai_backend.main import app

def test_vertical_slice_gps_loss():
    with patch("ai_backend.llm.model.OllamaClient.warm_up", new_callable=AsyncMock), \
         patch("ai_backend.llm.model.OllamaClient.generate_analysis", new_callable=AsyncMock) as mock_gen:
        
        mock_gen.return_value = {
            "possible_causes": ["Loss of satellite lock during rocket ascent burn (inferred)"],
            "recommended_action": "Switch primary display to barometric altitude graph.",
            "suggested_action_id": "SHOW_BACKUP_ALTITUDE_SOURCE",
            "ai_status": "COMPLETE"
        }

        with TestClient(app) as client:
            # Verify /console route serves HTML
            console_res = client.get("/console")
            assert console_res.status_code == 200
            assert "VYOMA AI Monitoring - Development Console" in console_res.text

            # Send 3 telemetry samples with GPS Loss fault
            payload = {
                "timestamp": "2026-09-21T12:00:00Z",
                "flight_id": "FLIGHT-SLICE-01",
                "flight_phase": "ASCENT",
                "mpu6050": {"ax": 0.1, "ay": 0.1, "az": 1.0},
                "bmp280": {"pressure": 1000.0, "altitude": 100.0},
                "gps": {"latitude": 0.0, "longitude": 0.0, "speed": 10.0, "fix": False},
                "battery": {"voltage": 3.8}
            }

            res1 = client.post("/telemetry", json=payload)
            res2 = client.post("/telemetry", json=payload)
            res3 = client.post("/telemetry", json=payload)
            
            assert res3.status_code == 200
            alerts = res3.json()["alerts_triggered"]
            assert len(alerts) == 1
            alert = alerts[0]
            
            assert alert["fault"] == "GPS_LOSS"
            assert alert["sensor"] == "gps"
            assert alert["severity"] == "HIGH"
            assert alert["ai_status"] == "PENDING"
            assert alert["confidence"] == 0.95
