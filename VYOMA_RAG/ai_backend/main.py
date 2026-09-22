from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import os

from ai_backend.config import settings
from ai_backend.services.monitoring import MonitoringService
from ai_backend.api import telemetry, analysis, websocket

monitoring_service = MonitoringService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    global monitoring_service
    monitoring_service = MonitoringService()
    await monitoring_service.start()
    telemetry.set_monitoring_service(monitoring_service)
    analysis.set_monitoring_service(monitoring_service)
    websocket.set_monitoring_service(monitoring_service)
    yield
    await monitoring_service.stop()

app = FastAPI(
    title="VYOMA AI Monitoring Backend",
    description="Real-time AI-assisted flight monitoring backend with deterministic fault detection and hybrid RAG",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(telemetry.router)
app.include_router(analysis.router)
app.include_router(websocket.router)

# Serve Development Test Console at /console
@app.get("/console", response_class=FileResponse)
async def serve_test_console():
    console_path = os.path.join(os.path.dirname(__file__), "static", "console.html")
    return FileResponse(console_path)

@app.get("/")
async def root():
    return {
        "service": "VYOMA AI Monitoring Backend",
        "status": "ONLINE",
        "console_url": "/console",
        "health_url": "/health",
        "websocket_url": "/ws/telemetry"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("ai_backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
