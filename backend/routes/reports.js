const express = require("express");
const { db } = require("../database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/:missionId/data", async (req, res) => {
  const missionId = req.params.missionId;
  
  try {
    const missionInfo = await db.get("SELECT * FROM missions WHERE id = ?", [missionId]);
    if (!missionInfo) return res.status(404).json({ error: "Mission not found." });

    const telemetry = await db.all("SELECT * FROM telemetry WHERE mission_id = ? ORDER BY timestamp ASC", [missionId]);
    const missionEvents = await db.all("SELECT * FROM mission_events WHERE mission_id = ? ORDER BY timestamp ASC", [missionId]);
    const settingsRow = await db.get("SELECT setting_value FROM global_settings WHERE setting_key = 'app_settings' ORDER BY id DESC LIMIT 1");
    let settings = {};
    if (settingsRow && settingsRow.setting_value) {
      try { settings = JSON.parse(settingsRow.setting_value); } catch(e){}
    }

    const statsQuery = `SELECT 
        MAX(altitude) as maxAltitude, 
        MIN(altitude) as minAltitude,
        MAX(ABS(velocity)) as maxVelocity,
        MAX(GREATEST(IFNULL(ABS(accel_x), 0), IFNULL(ABS(accel_y), 0), IFNULL(ABS(accel_z), 0))) as maxAccel,
        MAX(GREATEST(IFNULL(ABS(gyro_x), 0), IFNULL(ABS(gyro_y), 0), IFNULL(ABS(gyro_z), 0))) as maxGyro,
        MIN(temperature) as minTemp, MAX(temperature) as maxTemp,
        MIN(humidity) as minHum, MAX(humidity) as maxHum,
        MIN(mq09) as minMq09, MAX(mq09) as maxMq09,
        MIN(mq135) as minMq135, MAX(mq135) as maxMq135
        FROM telemetry WHERE mission_id = ?`;
        
    const stats = await db.get(statsQuery, [missionId]);

    const durationSec = telemetry.length > 0 
      ? (new Date(telemetry[telemetry.length-1].timestamp).getTime() - new Date(telemetry[0].timestamp).getTime()) / 1000
      : 0;

    const flightSummary = {
      maxAltitude: stats?.maxAltitude || 0,
      minAltitude: stats?.minAltitude || 0,
      currentAltitude: telemetry.length > 0 ? telemetry[telemetry.length-1].altitude : 0,
      maxVelocity: stats?.maxVelocity || 0,
      currentVelocity: telemetry.length > 0 ? telemetry[telemetry.length-1].velocity : 0,
      maxAccel: stats?.maxAccel || 0,
      maxGyro: stats?.maxGyro || 0,
      flightTime: durationSec
    };

    const environmentalData = {
      maxTemp: stats?.maxTemp || null,
      minTemp: stats?.minTemp || null,
      maxHum: stats?.maxHum || null,
      minHum: stats?.minHum || null,
    };

    const gasData = {
      mq09_max: stats?.maxMq09 || null,
      mq09_min: stats?.minMq09 || null,
      mq135_max: stats?.maxMq135 || null,
      mq135_min: stats?.minMq135 || null
    };

    const flameCount = missionEvents.filter(a => a.sensor === 'Flame').length;
    const flameData = {
      events: flameCount,
      firstDetection: flameCount > 0 ? missionEvents.find(a => a.sensor === 'Flame').timestamp : null,
      lastDetection: flameCount > 0 ? [...missionEvents].reverse().find(a => a.sensor === 'Flame').timestamp : null
    };

    // Construct the single payload
    const missionReport = {
      missionInfo,
      flightSummary,
      environmentalData,
      gasData,
      flameData,
      sensorStatus: settings.sensors || {},
      mode: settings.mode || 'LIVE',
      missionEvents,
      telemetry
    };

    res.json(missionReport);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error fetching report." });
  }
});

module.exports = router;
