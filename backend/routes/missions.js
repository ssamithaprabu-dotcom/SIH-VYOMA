const express = require("express");
const { db } = require("../database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

let currentMissionId = null;

router.get("/", async (req, res) => {
  try {
    const query = `
      SELECT 
        m.*,
        MAX(t.altitude) as max_altitude,
        MAX(ABS(t.velocity)) as max_velocity,
        MAX(MAX(IFNULL(ABS(t.accel_x), 0), IFNULL(ABS(t.accel_y), 0), IFNULL(ABS(t.accel_z), 0))) as max_acceleration,
        (strftime('%s', IFNULL(m.end_time, CURRENT_TIMESTAMP)) - strftime('%s', m.start_time)) as duration_sec
      FROM missions m
      LEFT JOIN telemetry t ON m.id = t.mission_id
      GROUP BY m.id
      ORDER BY m.start_time DESC
    `;
    const rows = await db.all(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch missions" });
  }
});

router.get("/current", async (req, res) => {
  if (!currentMissionId) return res.json(null);
  try {
    const row = await db.get("SELECT * FROM missions WHERE id = ?", [currentMissionId]);
    res.json(row || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.post("/", async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Mission name is required." });
  }

  const id = 'VYOMA-' + Date.now().toString();
  const operator = req.user ? req.user.username : 'Unknown';
  
  try {
    await db.run("INSERT INTO missions (id, name, operator, status) VALUES (?, ?, ?, 'IDLE')", [id, name.trim(), operator]);
    currentMissionId = id;
    const row = await db.get("SELECT * FROM missions WHERE id = ?", [id]);
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create mission" });
  }
});

router.post("/current/end", async (req, res) => {
  if (!currentMissionId) {
    return res.status(400).json({ error: "No active mission to end." });
  }
  const id = currentMissionId;
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL DATETIME format
  try {
    await db.run("UPDATE missions SET status = 'LANDED', end_time = ? WHERE id = ?", [nowStr, id]);
    currentMissionId = null;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to end mission" });
  }
});

router.get("/:id/details", async (req, res) => {
  const missionId = req.params.id;
  try {
    const mission = await db.get("SELECT * FROM missions WHERE id = ?", [missionId]);
    if (!mission) return res.status(404).json({ error: "Mission not found" });

    const statsQuery = `
      SELECT 
        MAX(altitude) as maxAltitude,
        MAX(ABS(velocity)) as maxVelocity,
        MAX(MAX(IFNULL(ABS(accel_x), 0), IFNULL(ABS(accel_y), 0), IFNULL(ABS(accel_z), 0))) as maxAccel,
        MAX(MAX(IFNULL(ABS(gyro_x), 0), IFNULL(ABS(gyro_y), 0), IFNULL(ABS(gyro_z), 0))) as maxGyro,
        MIN(temperature) as minTemp, MAX(temperature) as maxTemp,
        MIN(humidity) as minHum, MAX(humidity) as maxHum,
        MIN(mq09) as minMq09, MAX(mq09) as maxMq09,
        MIN(mq135) as minMq135, MAX(mq135) as maxMq135
      FROM telemetry WHERE mission_id = ?
    `;

    const stats = await db.get(statsQuery, [missionId]);
    const flameCountRow = await db.get("SELECT COUNT(*) as flameEvents FROM mission_events WHERE mission_id = ? AND sensor = 'Flame'", [missionId]);
    
    res.json({
      mission,
      stats: stats || {},
      flameEvents: flameCountRow ? flameCountRow.flameEvents : 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/:id/alerts", async (req, res) => {
  try {
    const rows = await db.all("SELECT * FROM mission_events WHERE mission_id = ? ORDER BY timestamp DESC", [req.params.id]);
    res.json(rows || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = { router, getCurrentMissionId: () => currentMissionId };
