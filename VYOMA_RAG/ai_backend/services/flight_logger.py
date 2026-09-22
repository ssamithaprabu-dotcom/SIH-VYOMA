import sqlite3
import asyncio
import json
import os
import time
from typing import Dict, Any, Optional
from ai_backend.models.telemetry import TelemetryPayload
from ai_backend.models.ai_response import AIAlert

class FlightLogger:
    """
    Lightweight, non-blocking append-only logger using SQLite.
    Pushes log events onto an async queue to ensure zero latency impact on main /telemetry endpoint.
    """
    def __init__(self, db_path: str = "flight_records.db"):
        self.db_path = db_path
        self.queue: asyncio.Queue = asyncio.Queue()
        self.worker_task: Optional[asyncio.Task] = None
        self._init_db()

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path) if os.path.dirname(self.db_path) else ".", exist_ok=True)
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Telemetry log table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS telemetry_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                flight_id TEXT,
                flight_phase TEXT,
                payload_json TEXT,
                created_at REAL
            )
        """)
        
        # Alert log table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alert_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id TEXT,
                timestamp TEXT,
                flight_id TEXT,
                sensor TEXT,
                fault TEXT,
                severity TEXT,
                status TEXT,
                recommended_action TEXT,
                sources_json TEXT,
                created_at REAL
            )
        """)
        conn.commit()
        conn.close()

    async def start(self):
        self.worker_task = asyncio.create_task(self._process_queue())

    async def stop(self):
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass

    def log_telemetry_nonblocking(self, payload: TelemetryPayload):
        """Put telemetry payload into queue without waiting."""
        try:
            self.queue.put_nowait(("telemetry", payload.model_dump()))
        except Exception as e:
            print(f"[FlightLogger] Telemetry queue error: {e}")

    def log_alert_nonblocking(self, alert: AIAlert):
        """Put alert record into queue without waiting."""
        try:
            self.queue.put_nowait(("alert", alert.model_dump()))
        except Exception as e:
            print(f"[FlightLogger] Alert queue error: {e}")

    async def _process_queue(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        while True:
            try:
                event_type, data = await self.queue.get()
                now = time.time()
                if event_type == "telemetry":
                    cursor.execute(
                        "INSERT INTO telemetry_logs (timestamp, flight_id, flight_phase, payload_json, created_at) VALUES (?, ?, ?, ?, ?)",
                        (
                            data.get("timestamp", ""),
                            data.get("flight_id", ""),
                            data.get("flight_phase", ""),
                            json.dumps(data),
                            now
                        )
                    )
                elif event_type == "alert":
                    cursor.execute(
                        "INSERT INTO alert_logs (alert_id, timestamp, flight_id, sensor, fault, severity, status, recommended_action, sources_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        (
                            data.get("alert_id", ""),
                            data.get("timestamp", ""),
                            data.get("flight_id", ""),
                            data.get("sensor", ""),
                            data.get("fault", ""),
                            data.get("severity", ""),
                            data.get("status", ""),
                            data.get("recommended_action", ""),
                            json.dumps(data.get("sources", [])),
                            now
                        )
                    )
                conn.commit()
                self.queue.task_done()
            except (asyncio.CancelledError, GeneratorExit):
                conn.close()
                break
            except Exception as e:
                print(f"[FlightLogger] Database write error: {e}")
