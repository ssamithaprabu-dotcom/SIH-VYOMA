from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any, List, Union
from ai_backend.services.monitoring import MonitoringService

router = APIRouter()
_monitoring_service: Union[MonitoringService, None] = None

def set_monitoring_service(service: MonitoringService):
    global _monitoring_service
    _monitoring_service = service

@router.post("/telemetry")
async def post_telemetry(payload: Union[Dict[str, Any], List[Dict[str, Any]]]):
    if not _monitoring_service:
        raise HTTPException(status_code=500, detail="Monitoring service not initialized")

    if isinstance(payload, list):
        results = []
        for sample in payload:
            alerts = await _monitoring_service.process_telemetry(sample)
            results.extend(alerts)
        return {"status": "processed", "samples_count": len(payload), "alerts_triggered": [a.model_dump() for a in results]}

    alerts = await _monitoring_service.process_telemetry(payload)
    return {"status": "processed", "alerts_triggered": [a.model_dump() for a in alerts]}
