# VYOMA Mission Console

A professional telemetry dashboard for the VYOMA rocket/CanSat avionics kit (SIH26226).
Login-protected, live over Wi-Fi, with 3D orientation, live graphs, gas-level
indicators, PDF reports, a settings page, and a built-in chat assistant.

```
vyoma-dashboard/
├── backend/     Express + Socket.IO API, JSON file storage, PDF reports
├── frontend/    React + Vite dashboard
└── firmware/    Sample ESP8266 Arduino sketch
```

## 1. Run the backend

```
cd backend
npm install
cp .env.example .env      # then edit DEFAULT_USERNAME/PASSWORD, DEVICE_KEY
npm start
```

This starts the API + WebSocket server on `http://localhost:4000` and prints
the auto-created login the first time it runs. Telemetry is stored in
`backend/data/` as plain JSON/JSONL files - no database install required.

## 2. Run the frontend

```
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. In development, Vite proxies `/api` and the
WebSocket to the backend on port 4000, so both must be running.

For your SIH demo laptop, you can instead run `npm run build` in `frontend/`
and serve the `dist/` folder from any static host, or from the backend
itself (add `express.static` for `frontend/dist` in `server.js`) so the
whole dashboard is one URL.

## 3. Connect the ESP8266

1. In **Settings**, confirm the ESP8266's IP address (whatever your router
   assigns it, e.g. `192.168.1.50`).
2. Flash `firmware/vyoma_esp8266/vyoma_esp8266.ino`, filling in your Wi-Fi
   credentials, the laptop's IP running the backend, and matching
   `DEVICE_KEY` from `backend/.env`.
3. Once powered on the same Wi-Fi network as your laptop, the ESP8266 POSTs
   a telemetry point roughly every 150ms to `/api/telemetry`, and it appears
   on the dashboard live via WebSocket.
4. Telemetry only gets accepted once a mission is active - create one from
   the dashboard (or Settings) before powering up the rocket.

## How each requested feature is implemented

| Requested feature | Where |
|---|---|
| Login (username/password) | `backend/routes/auth.js`, `frontend/src/pages/Login.jsx` |
| Timestamp, temperature, humidity | Telemetry payload + `SensorCard` |
| Gas concentration (MQ-09, MQ-135) with high/low indication and color | `GasIndicator.jsx` - green/amber/red based on thresholds you set in Settings |
| Altitude from "sea level" | Estimated server-side by integrating IMU acceleration - see caveat below |
| Orientation (X/Y/Z, left/right) with visual rocket | `RocketOrientation.jsx` (three.js), roll/pitch/yaw from a gyro+accel complementary filter |
| Velocity, acceleration, max height, time of flight, angular velocity graphs | `TelemetryCharts.jsx` (recharts) + stat cards on the Dashboard |
| Color-coded gas high/low | `GasIndicator.jsx` |
| Report generation | "Generate report" button → PDF via `backend/routes/reports.js` (pdfkit) |
| Settings: sensor checkboxes, IP configuration | `frontend/src/pages/Settings.jsx` |
| Only checked/connected sensors shown on dashboard | Dashboard reads `settings.sensors` and conditionally renders each card |
| Mission naming (new name per run) | First-use modal + "Start new mission" in Settings; each mission gets its own telemetry log |
| Wi-Fi connection to the rocket | ESP8266 posts over your local Wi-Fi to the backend's `/api/telemetry` |
| Chatbot | Floating widget bottom-right; answers from live telemetry, optionally via Claude if you set `ANTHROPIC_API_KEY` |
| React frontend / Node.js backend | as structured above |

### Important caveat: altitude accuracy

Your current sensor list (DHT22, MQ-09, flame, MPU6050) has **no barometer**,
so there's no direct way to measure altitude above sea level. This dashboard
estimates altitude and vertical velocity by double-integrating the IMU's
acceleration (`backend/flightMath.js`), with a simple zero-velocity update
to fight drift while the rocket is at rest. This works reasonably well for
short flights but will drift on longer ones - it's flagged as "estimated"
throughout the UI and in the PDF report. For measurement-grade altitude,
add a **BMP280** barometer (your own Phase 2 roadmap already includes this)
and swap the altitude calculation to `44330 * (1 - (P/P0)^0.1903)`.

### MQ-09 and MQ-135 - what each actually detects

Since you asked which gases these two sensors can pick up:

- **MQ-9**: carbon monoxide (CO), LPG, and other flammable/combustible
  gases such as methane/natural gas. It's tuned for combustion byproducts
  and fuel leaks, not general air quality.
- **MQ-135**: ammonia (NH3), carbon dioxide (CO2), and benzene, alongside
  alcohol, smoke, and NOx more broadly. It's the general "air quality"
  sensor in the MQ family, not a specific-gas sensor.

MQ-135 isn't in your current wiring table, but `mq135` is already wired
into the backend and Settings page (unchecked by default) so you can add
the hardware later without touching the code.

## Security notes for your demo

- Change `DEFAULT_USERNAME` / `DEFAULT_PASSWORD` and `DEVICE_KEY` in
  `backend/.env` before your SIH presentation - they ship with obvious
  defaults so the project runs out of the box.
- The dashboard and ESP8266 are meant to share a local Wi-Fi network (e.g. a
  phone hotspot at the launch site), not the open internet.
