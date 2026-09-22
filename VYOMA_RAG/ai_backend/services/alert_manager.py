from typing import Dict, Any, List, Optional
from ai_backend.models.ai_response import AIAlert
import uuid
import time

class AlertManager:
    """
    Manages active alert lifecycle and fast-path updates.
    1. Instantly creates PENDING alert from rule detector findings.
    2. Updates existing alert by alert_id when RAG + LLM analysis completes (COMPLETE / FALLBACK).
    3. Computes heuristic confidence score.
    """
    def __init__(self):
        self.active_alerts: Dict[str, AIAlert] = {}
        self.alert_history: List[AIAlert] = []

    def create_pending_alert(self, fault_data: Any, default_action: str) -> AIAlert:
        alert_id = f"ALT-{uuid.uuid4().hex[:8].upper()}"
        
        # Heuristic confidence calculation based on evidence clarity
        confidence = 0.95 if fault_data.severity in ("HIGH", "CRITICAL") else 0.85

        alert = AIAlert(
            alert_id=alert_id,
            timestamp=fault_data.timestamp or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            flight_id=fault_data.flight_id,
            status="CRITICAL" if fault_data.severity == "CRITICAL" else "WARNING",
            sensor=fault_data.sensor,
            parameter=fault_data.parameter,
            current_value=fault_data.current_value,
            unit=fault_data.unit,
            flight_phase=fault_data.flight_phase,
            fault=fault_data.fault,
            severity=fault_data.severity,
            measured_evidence=fault_data.measured_evidence,
            possible_causes=["Analyzing telemetry with AI model..."],
            recommended_action=default_action,
            suggested_action_id=None,
            confidence=confidence,
            ai_status="PENDING",
            sources=[]
        )

        self.active_alerts[alert_id] = alert
        self.alert_history.append(alert)
        return alert

    def update_alert_with_ai(self, alert_id: str, ai_result: Dict[str, Any], sources: List[str]) -> Optional[AIAlert]:
        if alert_id not in self.active_alerts:
            return None

        alert = self.active_alerts[alert_id]
        alert.possible_causes = ai_result.get("possible_causes", alert.possible_causes)
        alert.recommended_action = ai_result.get("recommended_action", alert.recommended_action)
        alert.suggested_action_id = ai_result.get("suggested_action_id")
        alert.ai_status = ai_result.get("ai_status", "COMPLETE")
        alert.sources = sources
        
        # Increase heuristic confidence slightly after RAG validation
        if alert.ai_status == "COMPLETE" and sources:
            alert.confidence = min(0.99, alert.confidence + 0.04)

        return alert

    def get_recent_faults(self, limit: int = 20) -> List[AIAlert]:
        return self.alert_history[-limit:]
