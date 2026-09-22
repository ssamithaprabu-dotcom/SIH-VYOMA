import asyncio
from typing import Dict, Any, List, Callable, Awaitable, Optional
from ai_backend.models.telemetry import TelemetryPayload
from ai_backend.adapters.default import TelemetryAdapter
from ai_backend.anomaly.detector import AnomalyDetector, DetectedFault
from ai_backend.rag.retriever import HybridRetriever
from ai_backend.llm.model import OllamaClient
from ai_backend.services.alert_manager import AlertManager
from ai_backend.services.flight_logger import FlightLogger
from ai_backend.models.ai_response import AIAlert
from ai_backend.config import settings

class MonitoringService:
    """
    Main monitoring orchestrator.
    - Receives telemetry via adapter
    - Runs Layer 1 real-time fault detector
    - Emits instant PENDING alerts over WebSocket subscriber callbacks
    - Pushes task to bounded async background queue for Layer 2 RAG + LLM processing
    - Emits COMPLETE/FALLBACK alert updates over WebSocket
    """
    def __init__(self):
        self.adapter = TelemetryAdapter()
        self.detector = AnomalyDetector()
        self.retriever = HybridRetriever(settings.KNOWLEDGE_BASE_PATH)
        self.ollama_client = OllamaClient()
        self.alert_manager = AlertManager()
        self.logger = FlightLogger()
        self.subscribers: List[Callable[[Dict[str, Any]], Awaitable[None]]] = []

        self.background_queue: asyncio.Queue = asyncio.Queue(maxsize=settings.BACKGROUND_WORKER_QUEUE_SIZE)
        self.worker_task: Optional[asyncio.Task] = None

    def register_subscriber(self, callback: Callable[[Dict[str, Any]], Awaitable[None]]):
        self.subscribers.append(callback)

    def unregister_subscriber(self, callback: Callable[[Dict[str, Any]], Awaitable[None]]):
        if callback in self.subscribers:
            self.subscribers.remove(callback)

    async def broadcast_envelope(self, msg_type: str, data: Any):
        envelope = {"type": msg_type, "data": data.model_dump() if hasattr(data, "model_dump") else data}
        for sub in list(self.subscribers):
            try:
                await sub(envelope)
            except Exception as e:
                print(f"[MonitoringService] Subscriber broadcast error: {e}")

    async def start(self):
        """Start background queue worker task and flight logger worker."""
        await self.logger.start()
        self.worker_task = asyncio.create_task(self._process_background_queue())
        await self.ollama_client.warm_up()

    async def stop(self):
        await self.logger.stop()
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass

    async def process_telemetry(self, raw_payload: Dict[str, Any]) -> List[AIAlert]:
        payload: TelemetryPayload = self.adapter.adapt(raw_payload)

        # Log raw telemetry asynchronously (non-blocking)
        self.logger.log_telemetry_nonblocking(payload)

        # Broadcast live raw telemetry sample envelope
        await self.broadcast_envelope("telemetry", payload)

        # Layer 1: Deterministic Fault Detection
        detected_faults: List[DetectedFault] = self.detector.detect(payload)
        generated_alerts: List[AIAlert] = []

        for fault in detected_faults:
            default_action = self.detector.thresholds_cfg.get("faults", {}).get(fault.fault, {}).get(
                "default_recommended_action", "Follow standard troubleshooting guidelines."
            )
            
            # Step 1: Instantly publish PENDING alert
            pending_alert = self.alert_manager.create_pending_alert(fault, default_action)
            self.logger.log_alert_nonblocking(pending_alert)
            generated_alerts.append(pending_alert)
            await self.broadcast_envelope("ai_alert", pending_alert)

            # Step 2: Queue for background RAG + LLM analysis
            task_item = (pending_alert, fault)
            try:
                self.background_queue.put_nowait(task_item)
            except asyncio.QueueFull:
                print("[MonitoringService] Background worker queue full, dropping RAG task.")

        return generated_alerts

    async def _process_background_queue(self):
        while True:
            try:
                alert, fault = await self.background_queue.get()
                try:
                    # Step 3: Layer 2 Hybrid RAG Retrieval
                    rag_results = self.retriever.retrieve_for_fault(
                        sensor=fault.sensor,
                        fault_id=fault.fault,
                        flight_phase=fault.flight_phase,
                        top_k=settings.RAG_TOP_K
                    )
                    sources = list(set([r.get("source", "doc") for r in rag_results]))

                    # Step 4: Layer 2 Ollama LLM Inference
                    ai_res = await self.ollama_client.generate_analysis(
                        sensor=fault.sensor,
                        parameter=fault.parameter,
                        current_value=fault.current_value,
                        unit=fault.unit,
                        flight_phase=fault.flight_phase,
                        fault=fault.fault,
                        severity=fault.severity,
                        measured_evidence=fault.measured_evidence,
                        context_chunks=rag_results
                    )

                    # Step 5: Update alert and publish ai_alert_update envelope
                    updated_alert = self.alert_manager.update_alert_with_ai(alert.alert_id, ai_res, sources)
                    if updated_alert:
                        self.logger.log_alert_nonblocking(updated_alert)
                        await self.broadcast_envelope("ai_alert_update", updated_alert)
                finally:
                    self.background_queue.task_done()
            except (asyncio.CancelledError, GeneratorExit):
                break
            except Exception as e:
                print(f"[MonitoringService] Worker processing error: {e}")
