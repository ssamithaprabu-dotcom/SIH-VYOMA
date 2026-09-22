from pydantic import BaseModel, Field
from typing import List, Optional

class AIAlert(BaseModel):
    alert_id: str
    timestamp: str
    flight_id: str
    status: str = "WARNING"  # NORMAL | WARNING | CRITICAL
    sensor: str
    parameter: str
    current_value: str
    unit: str
    flight_phase: str
    fault: str
    severity: str = "HIGH"  # LOW | MEDIUM | HIGH | CRITICAL
    measured_evidence: str
    possible_causes: List[str] = Field(default_factory=list)  # LLM inference
    recommended_action: str = ""  # LLM grounded recommendation
    suggested_action_id: Optional[str] = None  # LLM whitelisted action ID or null
    confidence: float = 1.0  # Backend heuristic
    ai_status: str = "PENDING"  # PENDING | COMPLETE | FALLBACK
    sources: List[str] = Field(default_factory=list)  # RAG document sources
