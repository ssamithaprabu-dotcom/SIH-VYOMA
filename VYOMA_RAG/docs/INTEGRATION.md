# VYOMA Dashboard & Frontend Integration Contract (v1)

This document defines the integration specification for connecting the **VYOMA Ground Station Dashboard** (or hardware serial bridge) to the **VYOMA AI Monitoring Backend**.

---

## 1. How to Start the AI Backend locally

### Prerequisites
- Python 3.13 (or 3.11/3.12)
- Local Ollama instance (installed from [ollama.com](https://ollama.com)) with target model `llama3.2:1b`.

### Launch Steps
```bash
# 1. Pull the target 1B LLM model in Ollama
ollama pull llama3.2:1b

# 2. Activate virtual environment and start FastAPI backend
.\.venv\Scripts\activate
uvicorn ai_backend.main:app --host 0.0.0.0 --port 8000
```
The server starts at `http://localhost:8000`. Access the development test console at `http://localhost:8000/console`.

---

## 2. Integration Architecture Options

### Option A: Dashboard Backend / Gateway Forwarding (Recommended)
```
[Hardware Sensors / LoRa]
          │
          ▼
[Dashboard Data Source] ──(POST /telemetry)──► [FastAPI AI Backend]
          │                                          │
          │ (Raw Telemetry)                          │ (AI Alerts over WS)
          ▼                                          ▼
[Dashboard Frontend UI] ◄════════════════════════════╝
```

### Option B: Direct Hardware / Serial Bridge Connection
```
[Serial / LoRa Gateway Script] ──(POST /telemetry or WS)──► [FastAPI AI Backend]
                                                                  │
                                                                  │ (Enveloped WS Stream)
                                                                  ▼
                                                       [Dashboard Frontend UI]
```

---

## 3. Telemetry Schema & Payload Formats

### REST API: `POST /telemetry`
**Endpoint:** `http://localhost:8000/telemetry`  
**Method:** `POST`  
**Header:** `Content-Type: application/json`

#### Contract v1 Proposal Request Payload Example
```json
{
    "timestamp": "2026-09-21T12:00:00Z",
    "flight_id": "FLIGHT-001",
    "flight_phase": "ASCENT",
    "mpu6050": {
        "ax": 0.2, "ay": 0.1, "az": 1.1,
        "gx": 0.0, "gy": 0.0, "gz": 0.0
    },
    "bmp280": {
        "pressure": 1013.25,
        "altitude": 120.5
    },
    "gps": {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "speed": 18.5,
        "fix": true
    },
    "battery": {
        "voltage": 3.8
    },
    "comms": { "status": "OK" },
    "recovery": { "status": "ARMED" },
    "logging": { "sd_status": "OK" }
}
```

---

## 4. WebSocket Message Specification (`/ws/telemetry`)

**URL:** `ws://localhost:8000/ws/telemetry`

Every message sent by the AI Backend uses a typed envelope JSON structure:
```json
{
    "type": "telemetry" | "ai_alert" | "ai_alert_update" | "status",
    "data": { ... }
}
```

### Envelope 1: `"type": "telemetry"`
Broadcasts raw normalized telemetry samples.

### Envelope 2: `"type": "ai_alert"` (Instant Fast-Path Alert)
Emitted the instant Layer 1 detects a fault (`ai_status: "PENDING"`).
```json
{
    "type": "ai_alert",
    "data": {
        "alert_id": "ALT-9A3F1B2C",
        "timestamp": "2026-09-21T12:00:00Z",
        "flight_id": "FLIGHT-001",
        "status": "WARNING",
        "sensor": "gps",
        "parameter": "fix",
        "current_value": "fix=False, lat=0.0000, lon=0.0000",
        "unit": "deg",
        "flight_phase": "ASCENT",
        "fault": "GPS_LOSS",
        "severity": "HIGH",
        "measured_evidence": "GPS fix false or zero coordinates (lat=0.0000, lon=0.0000, fix=False)",
        "possible_causes": ["Analyzing telemetry with AI model..."],
        "recommended_action": "Switch flight monitoring to barometric altitude source and check antenna connection",
        "suggested_action_id": null,
        "confidence": 0.95,
        "ai_status": "PENDING",
        "sources": []
    }
}
```

### Envelope 3: `"type": "ai_alert_update"` (Async RAG + LLM Complete Alert)
Emitted when background RAG + Ollama Llama 3.2 1B processing finishes (`ai_status: "COMPLETE"` or `"FALLBACK"`). Matches the exact `alert_id`.
```json
{
    "type": "ai_alert_update",
    "data": {
        "alert_id": "ALT-9A3F1B2C",
        "timestamp": "2026-09-21T12:00:00Z",
        "flight_id": "FLIGHT-001",
        "status": "WARNING",
        "sensor": "gps",
        "parameter": "fix",
        "current_value": "fix=False, lat=0.0000, lon=0.0000",
        "unit": "deg",
        "flight_phase": "ASCENT",
        "fault": "GPS_LOSS",
        "severity": "HIGH",
        "measured_evidence": "GPS fix false or zero coordinates (lat=0.0000, lon=0.0000, fix=False)",
        "possible_causes": [
            "Loss of satellite lock due to rocket motor burn vibration (inferred)",
            "Active patch antenna disconnection or CFRP rocket body RF shadowing (inferred)"
        ],
        "recommended_action": "Ground station software should mark GPS positional data as suspect and switch main display to secondary barometric altitude graph.",
        "suggested_action_id": "SHOW_BACKUP_ALTITUDE_SOURCE",
        "confidence": 0.99,
        "ai_status": "COMPLETE",
        "sources": ["neo6m.md", "gps_loss.md"]
    }
}
```

---

## 5. Frontend JavaScript WebSocket Integration Example

```javascript
// Plain JavaScript integration example for the Dashboard team
const alertMap = new Map();
const socket = new WebSocket("ws://localhost:8000/ws/telemetry");

socket.onmessage = (event) => {
    const envelope = JSON.parse(event.data);

    if (envelope.type === "ai_alert" || envelope.type === "ai_alert_update") {
        const alert = envelope.data;
        // Store or update alert state by alert_id
        alertMap.set(alert.alert_id, alert);
        renderAlertCard(alert);
    }
};

function renderAlertCard(alert) {
    let card = document.getElementById(`alert-${alert.alert_id}`);
    if (!card) {
        card = document.createElement("div");
        card.id = `alert-${alert.alert_id}`;
        document.getElementById("alerts-container").prepend(card);
    }

    // UI Requirements:
    // 1. Show ai_status (PENDING / COMPLETE / FALLBACK)
    // 2. Label causes as "AI Inference"
    // 3. Label confidence as "heuristic"
    card.innerHTML = `
        <div class="alert-title">${alert.fault} [${alert.severity}] - Status: ${alert.ai_status}</div>
        <div>Evidence: ${alert.measured_evidence}</div>
        <div>Confidence: ${(alert.confidence * 100).toFixed(0)}% (heuristic)</div>
        <div class="causes">
            <strong>AI Inferences:</strong>
            <ul>${alert.possible_causes.map(c => `<li>${c}</li>`).join('')}</ul>
        </div>
        <div><strong>Recommendation:</strong> ${alert.recommended_action}</div>
    `;
}
```

---

## 6. Parameters & Units Requiring Hardware Team Confirmation

Please confirm the following values with the firmware/hardware team so the adapter configuration can be finalized:
- `acceleration` units: `g` vs `m/s^2`
- `gyroscope` units: `deg/s` vs `rad/s`
- `pressure` units: `hPa` vs `Pa`
- `altitude` units: `metres` vs `feet`
- `speed` units: `m/s` vs `km/h`
- Flight phases list: `["PAD", "ASCENT", "COAST", "DESCENT", "LANDED"]`
