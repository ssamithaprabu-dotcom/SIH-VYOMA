from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Set, Any, Dict
from ai_backend.services.monitoring import MonitoringService
import json

router = APIRouter()
_monitoring_service: Any = None
active_connections: Set[WebSocket] = set()

def set_monitoring_service(service: MonitoringService):
    global _monitoring_service
    _monitoring_service = service

async def broadcast_callback(envelope: Dict[str, Any]):
    disconnected = set()
    msg_str = json.dumps(envelope)
    for conn in list(active_connections):
        try:
            await conn.send_text(msg_str)
        except Exception:
            disconnected.add(conn)
    for conn in disconnected:
        active_connections.remove(conn)

@router.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.add(websocket)

    if _monitoring_service:
        _monitoring_service.register_subscriber(broadcast_callback)

    # Send initial status message on connection
    status_envelope = {
        "type": "status",
        "data": {
            "message": "Connected to VYOMA AI Monitoring Stream",
            "connection_status": "ONLINE"
        }
    }
    await websocket.send_text(json.dumps(status_envelope))

    try:
        while True:
            # Handle incoming WebSocket telemetry frames if pushed directly over WS
            data_text = await websocket.receive_text()
            try:
                raw_payload = json.loads(data_text)
                if _monitoring_service:
                    await _monitoring_service.process_telemetry(raw_payload)
            except Exception as e:
                print(f"[WebSocket] Error processing WS payload: {e}")
    except WebSocketDisconnect:
        active_connections.remove(websocket)
        if _monitoring_service:
            _monitoring_service.unregister_subscriber(broadcast_callback)
