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

router.get("/", (req, res) => {
  db.get("SELECT value FROM sensor_config WHERE key = 'app_settings'", (err, row) => {
    if (err) return res.status(500).json({ error: "DB Error" });
    if (!row) {
      return res.json(defaultSettings);
    }
    try {
      res.json(JSON.parse(row.value));
    } catch (e) {
      res.json(defaultSettings);
    }
  });
});

router.put("/", (req, res) => {
  const updates = req.body || {};
  
  db.get("SELECT value FROM sensor_config WHERE key = 'app_settings'", (err, row) => {
    let current = { ...defaultSettings };
    if (row) {
      try { current = JSON.parse(row.value); } catch(e){}
    }
    
    if (updates.mode) current.mode = updates.mode;
    if (updates.sensors) current.sensors = { ...current.sensors, ...updates.sensors };
    if (updates.network) current.network = { ...current.network, ...updates.network };
    if (updates.pressure) current.pressure = { ...current.pressure, ...updates.pressure };
    if (updates.thresholds) current.thresholds = { ...current.thresholds, ...updates.thresholds };

    db.run("INSERT OR REPLACE INTO sensor_config (id, key, value) VALUES ((SELECT id FROM sensor_config WHERE key = 'app_settings'), 'app_settings', ?)", 
      [JSON.stringify(current)], 
      (err) => {
        if (err) return res.status(500).json({ error: "DB Error" });
        res.json(current);
      }
    );
  });
});

module.exports = router;
