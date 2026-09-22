from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List
from ai_backend.services.monitoring import MonitoringService
import httpx
from ai_backend.config import settings

router = APIRouter()
_monitoring_service: Any = None

def set_monitoring_service(service: MonitoringService):
    global _monitoring_service
    _monitoring_service = service

@router.post("/analyze")
async def manual_analyze(payload: Dict[str, Any]):
    if not _monitoring_service:
        raise HTTPException(status_code=500, detail="Monitoring service not initialized")
    alerts = await _monitoring_service.process_telemetry(payload)
    return {"status": "analyzed", "alerts": [a.model_dump() for a in alerts]}

@router.get("/health")
async def health_check():
    ollama_reachable = False
    try:
        async with httpx.AsyncClient(timeout=0.2) as client:
            res = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if res.status_code == 200:
                ollama_reachable = True
    except Exception:
        ollama_reachable = False

    vectorstore_healthy = _monitoring_service.retriever.is_indexed if _monitoring_service else False

    return {
        "status": "healthy" if vectorstore_healthy else "degraded",
        "ollama_reachable": ollama_reachable,
        "ollama_url": settings.OLLAMA_BASE_URL,
        "model": settings.LLM_MODEL,
        "vectorstore_indexed": vectorstore_healthy
    }

@router.get("/ai/status")
async def ai_status():
    queue_size = _monitoring_service.background_queue.qsize() if _monitoring_service else 0
    active_subs = len(_monitoring_service.subscribers) if _monitoring_service else 0
    return {
        "status": "active",
        "background_queue_depth": queue_size,
        "active_websocket_connections": active_subs,
        "target_model": settings.LLM_MODEL
    }

@router.get("/faults")
async def get_faults():
    if not _monitoring_service:
        return []
    faults = _monitoring_service.alert_manager.get_recent_faults()
    return [f.model_dump() for f in faults]

@router.post("/rag/query")
async def rag_query(payload: Dict[str, Any]):
    query_text = payload.get("query", "")
    if not query_text:
        raise HTTPException(status_code=400, detail="Query field is required")
    if not _monitoring_service:
        raise HTTPException(status_code=500, detail="Monitoring service not initialized")
    
    results = _monitoring_service.retriever.query_semantic(query_text, top_k=settings.RAG_TOP_K)
    return {"query": query_text, "results": results}
