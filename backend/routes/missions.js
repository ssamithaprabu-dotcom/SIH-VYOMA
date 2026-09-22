const express = require("express");
const { db } = require("../database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

let currentMissionId = null;

router.get("/", (req, res) => {
  const query = `
    SELECT 
      m.*,
      MAX(t.altitude) as max_altitude,
      MAX(ABS(t.velocity)) as max_velocity,
      MAX(MAX(ABS(t.accel_x), ABS(t.accel_y), ABS(t.accel_z))) as max_acceleration,
      (julianday(IFNULL(m.end_time, CURRENT_TIMESTAMP)) - julianday(m.start_time)) * 86400 as duration_sec
    FROM missions m
    LEFT JOIN telemetry t ON m.id = t.mission_id
    GROUP BY m.id
    ORDER BY m.start_time DESC
  `;
  db.all(query, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to fetch missions" });
    }
    res.json(rows);
  });
});

router.get("/current", (req, res) => {
  if (!currentMissionId) return res.json(null);
  db.get("SELECT * FROM missions WHERE id = ?", [currentMissionId], (err, row) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(row || null);
  });
});

router.post("/", (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Mission name is required." });
  }

  const id = 'VYOMA-' + Date.now().toString();
  const operator = req.user ? req.user.username : 'Unknown';
  
  db.run("INSERT INTO missions (id, name, operator, status) VALUES (?, ?, ?, 'IDLE')", 
    [id, name.trim(), operator], 
    function(err) {
      if (err) return res.status(500).json({ error: "Failed to create mission" });
      currentMissionId = id;
      db.get("SELECT * FROM missions WHERE id = ?", [id], (err, row) => {
        res.status(201).json(row);
      });
  });
});

router.post("/current/end", (req, res) => {
  if (!currentMissionId) {
    return res.status(400).json({ error: "No active mission to end." });
  }
  const id = currentMissionId;
  const nowStr = new Date().toISOString();
  db.run("UPDATE missions SET status = 'LANDED', end_time = ? WHERE id = ?", [nowStr, id], function(err) {
    if (err) return res.status(500).json({ error: "Failed to end mission" });
    currentMissionId = null;
    res.json({ success: true });
  });
});

router.get("/:id/details", (req, res) => {
  const missionId = req.params.id;
  db.get("SELECT * FROM missions WHERE id = ?", [missionId], (err, mission) => {
    if (err || !mission) return res.status(404).json({ error: "Mission not found" });

    const statsQuery = `
      SELECT 
        MAX(altitude) as maxAltitude,
        MAX(ABS(velocity)) as maxVelocity,
        MAX(MAX(ABS(accel_x), ABS(accel_y), ABS(accel_z))) as maxAccel,
        MAX(MAX(ABS(gyro_x), ABS(gyro_y), ABS(gyro_z))) as maxGyro,
        MIN(temperature) as minTemp, MAX(temperature) as maxTemp,
        MIN(humidity) as minHum, MAX(humidity) as maxHum,
        MIN(mq9) as minMq09, MAX(mq9) as maxMq09,
        MIN(mq135) as minMq135, MAX(mq135) as maxMq135
      FROM telemetry WHERE mission_id = ?
    `;

    db.get(statsQuery, [missionId], (err, stats) => {
      db.get("SELECT COUNT(*) as flameEvents FROM alerts WHERE mission_id = ? AND sensor = 'Flame'", [missionId], (err, flameCountRow) => {
        const flameEvents = flameCountRow ? flameCountRow.flameEvents : 0;
        res.json({
          mission,
          stats: stats || {},
          flameEvents
        });
      });
    });
  });
});

router.get("/:id/alerts", (req, res) => {
  db.all("SELECT * FROM alerts WHERE mission_id = ? ORDER BY timestamp DESC", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows || []);
  });
});

module.exports = { router, getCurrentMissionId: () => currentMissionId };
