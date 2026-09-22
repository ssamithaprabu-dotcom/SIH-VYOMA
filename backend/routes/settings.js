const express = require("express");
const { db } = require("../database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

const defaultSettings = {
  mode: "SIMULATION",
  sensors: {
    dht22: true,
    mq09: true,
    mq135: false,
    flame: true,
    mpu6050: true,
    bmp280: false,
    gps: false,
    battery: false,
    lora: false,
    microsd: true,
    buzzer: true
  },
  network: {
    espIp: "192.168.4.1",
    port: 8080,
    telemetryInterval: 100,
    connectionTimeout: 5000
  },
  pressure: { p0: 1013.25 },
  thresholds: {
    mq09: { low: 200, normal: 300, high: 500, critical: 800 },
    mq135: { low: 200, normal: 300, high: 500, critical: 800 }
  }
};

router.get("/", async (req, res) => {
  try {
    const row = await db.get("SELECT setting_value FROM global_settings WHERE setting_key = 'app_settings'");
    if (!row) {
      return res.json(defaultSettings);
    }
    try {
      res.json(JSON.parse(row.setting_value));
    } catch (e) {
      res.json(defaultSettings);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB Error" });
  }
});

router.put("/", async (req, res) => {
  const updates = req.body || {};
  
  try {
    const row = await db.get("SELECT setting_value FROM global_settings WHERE setting_key = 'app_settings'");
    let current = { ...defaultSettings };
    if (row) {
      try { current = JSON.parse(row.setting_value); } catch(e){}
    }
    
    if (updates.mode) current.mode = updates.mode;
    if (updates.sensors) current.sensors = { ...current.sensors, ...updates.sensors };
    if (updates.network) current.network = { ...current.network, ...updates.network };
    if (updates.pressure) current.pressure = { ...current.pressure, ...updates.pressure };
    if (updates.thresholds) current.thresholds = { ...current.thresholds, ...updates.thresholds };

    // MySQL INSERT ON DUPLICATE KEY UPDATE equivalent to INSERT OR REPLACE
    await db.run(
      "INSERT INTO global_settings (setting_key, setting_value) VALUES ('app_settings', ?) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value", 
      [JSON.stringify(current)]
    );
    
    res.json(current);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB Error" });
  }
});

module.exports = router;
