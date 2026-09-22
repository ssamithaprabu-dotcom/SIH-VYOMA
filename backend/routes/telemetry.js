const express = require("express");
const { db } = require("../database");
const { requireAuth, requireDeviceKey } = require("../middleware/auth");
const flightMath = require("../flightMath");
const { getCurrentMissionId } = require("./missions");

// Track last alert times to prevent flooding (in memory)
const lastAlerts = {
  flame: 0,
  mq09: 0,
  mq135: 0
};

// Simple cache for settings to check thresholds
let cachedSettings = null;
let lastSettingsFetch = 0;

async function getSettings() {
  if (Date.now() - lastSettingsFetch > 5000) { // fetch every 5s max
    try {
      const row = await db.get("SELECT setting_value FROM global_settings WHERE setting_key = 'app_settings' ORDER BY id DESC LIMIT 1");
      if (row && row.setting_value) {
        try { cachedSettings = JSON.parse(row.setting_value); } catch(e){}
      }
    } catch(e) {}
    lastSettingsFetch = Date.now();
  }
  return cachedSettings || { thresholds: { mq09: { critical: 800 }, mq135: { critical: 800 } } };
}

module.exports = function buildTelemetryRouter(io) {
  const router = express.Router();

  router.post("/", requireDeviceKey, async (req, res) => {
    const missionId = req.body.missionId || getCurrentMissionId();
    if (!missionId) {
      return res.status(400).json({ error: "No active mission. Create a mission from the dashboard first." });
    }

    const b = req.body || {};
    const accel = b.accel || { x: 0, y: 0, z: 9.81 };
    const gyro = b.gyro || { x: 0, y: 0, z: 0 };
    const timestamp = b.timestamp ? Number(b.timestamp) : Date.now();

    const computed = flightMath.update(missionId, accel, gyro, timestamp);
    const settings = await getSettings();
    const isLive = settings.mode === 'LIVE';

    let finalAltitude = null;
    if (b.pressure !== undefined && b.pressure !== null) {
      const P = Number(b.pressure);
      const P0 = settings.pressure?.p0 || 1013.25;
      finalAltitude = 44330 * (1 - Math.pow(P / P0, 1 / 5.255));
      finalAltitude = Math.round(finalAltitude * 100) / 100;
    } else if (!isLive) {
      finalAltitude = computed.altitude;
    }

    const point = {
      timestamp,
      temperature: numOrNull(b.temperature),
      humidity: numOrNull(b.humidity),
      mq09: numOrNull(b.mq09),
      mq135: numOrNull(b.mq135),
      flame: b.flame ? 1 : 0,
      accel_x: accel.x,
      accel_y: accel.y,
      accel_z: accel.z,
      gyro_x: gyro.x,
      gyro_y: gyro.y,
      gyro_z: gyro.z,
      orientation: computed.orientation, // for websocket only, not saved in DB directly as columns, save parts if needed
      velocity: computed.velocity,
      altitude: finalAltitude,
    };

    const accelMagnitude = Math.sqrt(
      Math.pow(point.accel_x || 0, 2) + 
      Math.pow(point.accel_y || 0, 2) + 
      Math.pow(point.accel_z || 0, 2)
    );

    try {
      const query = `INSERT INTO telemetry 
        (mission_id, timestamp, temperature, humidity, mq135, mq09, flame_detected, 
         accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z, 
         altitude, velocity, acceleration, roll, pitch, yaw) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const nowStr = new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');

      await db.run(query, [
        missionId, nowStr, point.temperature, point.humidity, point.mq135, point.mq09, point.flame,
        point.accel_x, point.accel_y, point.accel_z, point.gyro_x, point.gyro_y, point.gyro_z,
        point.altitude, point.velocity, accelMagnitude, point.orientation?.roll || null, point.orientation?.pitch || null, point.orientation?.yaw || null
      ]);

      io.emit("telemetry", { missionId, point });
      res.status(201).json({ ok: true, computed });

      // Alert checking logic
      const s = await getSettings();
      const nowMs = Date.now();
      
      if (point.flame === 1 && (nowMs - lastAlerts.flame > 5000)) {
        lastAlerts.flame = nowMs;
        await db.run("INSERT INTO mission_events (mission_id, severity, sensor, message, timestamp) VALUES (?, ?, ?, ?, ?)", [missionId, 'CRITICAL', 'Flame', 'Flame detected', new Date().toISOString().slice(0, 19).replace('T', ' ')]);
      }
      
      if (point.mq09 !== null && point.mq09 >= (s.thresholds?.mq09?.critical || 800) && (nowMs - lastAlerts.mq09 > 5000)) {
        lastAlerts.mq09 = nowMs;
        await db.run("INSERT INTO mission_events (mission_id, severity, sensor, message, timestamp) VALUES (?, ?, ?, ?, ?)", [missionId, 'CRITICAL', 'MQ-09', 'Critical gas level', new Date().toISOString().slice(0, 19).replace('T', ' ')]);
      }
      
      if (point.mq135 !== null && point.mq135 >= (s.thresholds?.mq135?.critical || 800) && (nowMs - lastAlerts.mq135 > 5000)) {
        lastAlerts.mq135 = nowMs;
        await db.run("INSERT INTO mission_events (mission_id, severity, sensor, message, timestamp) VALUES (?, ?, ?, ?, ?)", [missionId, 'CRITICAL', 'MQ-135', 'Critical gas level', new Date().toISOString().slice(0, 19).replace('T', ' ')]);
      }
    } catch (err) {
      console.error("Telemetry insert error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "DB Error" });
      }
    }
  });

  router.get("/latest", requireAuth, async (req, res) => {
    const missionId = req.query.missionId || getCurrentMissionId();
    if (!missionId) return res.json(null);

    try {
      const row = await db.get("SELECT * FROM telemetry WHERE mission_id = ? ORDER BY timestamp DESC LIMIT 1", [missionId]);
      res.json(row || null);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "DB error" });
    }
  });

  router.get("/history", requireAuth, async (req, res) => {
    const missionId = req.query.missionId || getCurrentMissionId();
    const limit = Number(req.query.limit) || 500;
    if (!missionId) return res.json([]);

    try {
      const rows = await db.all("SELECT * FROM telemetry WHERE mission_id = ? ORDER BY timestamp DESC LIMIT ?", [missionId, limit]);
      res.json(rows.reverse());
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "DB error" });
    }
  });

  return router;
};

function numOrNull(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
