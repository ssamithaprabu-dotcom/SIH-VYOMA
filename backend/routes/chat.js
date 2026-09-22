const express = require("express");
const { db } = require("../database");
const { requireAuth } = require("../middleware/auth");
const { getCurrentMissionId } = require("./missions");

const router = express.Router();
router.use(requireAuth);

router.post("/", async (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) {
    return res.status(400).json({ error: "Message is required." });
  }

  const missionId = getCurrentMissionId();
  if (!missionId) {
    return res.json({ reply: "No mission is currently active. Start one from the dashboard to begin logging telemetry." });
  }

  db.get("SELECT * FROM missions WHERE id = ?", [missionId], (err, mission) => {
    if (err || !mission) return res.json({ reply: "Mission not found." });

    db.get("SELECT * FROM telemetry WHERE mission_id = ? ORDER BY timestamp DESC LIMIT 1", [missionId], async (err, latest) => {
      if (err) return res.json({ reply: "Error fetching telemetry." });

      db.get("SELECT value FROM sensor_config WHERE key = 'app_settings'", (err, row) => {
        let settings = { sensors: {} };
        if (row) {
          try { settings = JSON.parse(row.value); } catch(e){}
        }

        // get max stats
        db.get(`SELECT 
          MAX(altitude) as maxAltitude, 
          MAX(velocity) as maxVelocity,
          MAX(ABS(accel_x)) as mxX, MAX(ABS(accel_y)) as mxY, MAX(ABS(accel_z)) as mxZ 
          FROM telemetry WHERE mission_id = ?`, [missionId], async (err, stats) => {
          
          mission.maxAltitude = stats?.maxAltitude || 0;
          mission.maxVelocity = stats?.maxVelocity || 0;
          mission.maxAccel = Math.max(stats?.mxX || 0, stats?.mxY || 0, stats?.mxZ || 0);

          if (process.env.ANTHROPIC_API_KEY) {
            try {
              const reply = await askClaude(message, mission, latest, settings);
              return res.json({ reply });
            } catch (err) {
              console.error("Claude API call failed, falling back to built-in answers:", err.message);
            }
          }

          res.json({ reply: fallbackAnswer(message, mission, latest, settings) });
        });
      });
    });
  });
});

async function askClaude(message, mission, latest) {
  const context = `Current mission: "${mission.name}". Max altitude so far: ${mission.maxAltitude.toFixed(2)} m (estimated). Max velocity: ${mission.maxVelocity.toFixed(2)} m/s. Latest reading: ${JSON.stringify(latest)}.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system:
        "You are the onboard assistant for VYOMA, a student rocket avionics dashboard. " +
        "Answer questions about the flight data briefly and plainly, for a student operator " +
        "watching a live launch. " +
        context,
      messages: [{ role: "user", content: message }],
    }),
  });
  const data = await response.json();
  const text = (data.content || []).map((b) => b.text || "").join("\n").trim();
  return text || "I couldn't work that out from the current telemetry.";
}

function fallbackAnswer(message, mission, latest, settings) {
  const m = message.toLowerCase();
  const s = settings.sensors || {};

  if (!latest) return `Mission "${mission.name}" is active, but no telemetry has arrived yet.`;

  if (m.includes("unavailable") || m.includes("not connected")) {
    let unavail = [];
    if (s.dht22 && latest.temperature === null) unavail.push("DHT22");
    if (s.mq09 && latest.mq09 === null) unavail.push("MQ-09");
    if (s.mq135 && latest.mq135 === null) unavail.push("MQ-135");
    if (s.bmp280 && latest.altitude === null) unavail.push("BMP280");
    if (s.gps && latest.gps_lat === null) unavail.push("GPS");
    return unavail.length > 0 ? `The following sensors are unavailable: ${unavail.join(", ")}.` : "All enabled sensors are currently reporting data.";
  }
  if (m.includes("which sensors are connected") || m.includes("enabled")) {
    const enabled = Object.keys(s).filter(k => s[k]).join(", ");
    return `The currently enabled sensors are: ${enabled}.`;
  }
  if (m.includes("altitude") || m.includes("height")) {
    if (!s.bmp280 && !s.gps && !s.mpu6050) return "Altitude data is unavailable because the required altitude sensor is not connected.";
    return `Current altitude is ${latest.altitude?.toFixed(1) ?? "unavailable"} m. Max altitude is ${mission.maxAltitude.toFixed(1)} m.`;
  }
  if (m.includes("velocity") || m.includes("speed")) {
    return `Current velocity is ${latest.velocity?.toFixed(1) ?? "unavailable"} m/s. Max velocity is ${mission.maxVelocity.toFixed(1)} m/s.`;
  }
  if (m.includes("acceleration")) {
    if (!s.mpu6050) return "Acceleration data is unavailable because the MPU6050 is not connected.";
    const curA = Math.max(Math.abs(latest.accel_x), Math.abs(latest.accel_y), Math.abs(latest.accel_z));
    return `Current acceleration is ${curA.toFixed(2)} g. Max acceleration is ${mission.maxAccel.toFixed(2)} g.`;
  }
  if (m.includes("gas") || m.includes("smoke") || m.includes("mq")) {
    if (!s.mq09 && !s.mq135) return "Gas data is unavailable because gas sensors are not connected.";
    let res = "";
    if (s.mq09) res += `MQ-09 level: ${latest.mq09 ?? "unavailable"} ADC. `;
    if (s.mq135) res += `MQ-135 level: ${latest.mq135 ?? "unavailable"} ADC.`;
    return res.trim();
  }
  if (m.includes("flame") || m.includes("fire")) {
    if (!s.flame) return "Flame data is unavailable because the flame sensor is not connected.";
    return latest.flame === 1 ? "Yes, flame was detected!" : "No flame is currently detected.";
  }
  if (m.includes("ascending") || m.includes("ascent")) {
    if (mission.status === 'ASCENT') return "Yes, the rocket is currently ascending.";
    return `The rocket is currently in ${mission.status} phase.`;
  }
  if (m.includes("time of flight") || m.includes("duration")) {
    const endT = mission.end_time ? new Date(mission.end_time).getTime() : Date.now();
    const secs = (endT - new Date(mission.start_time).getTime()) / 1000;
    return `The mission duration is ${secs.toFixed(1)} seconds.`;
  }
  if (m.includes("summarize")) {
    return `Mission Summary: Status is ${mission.status}. Max altitude is ${mission.maxAltitude.toFixed(1)} m, Max velocity is ${mission.maxVelocity.toFixed(1)} m/s, Max acceleration is ${mission.maxAccel.toFixed(2)} g.`;
  }

  return `I have live telemetry for ${mission.name}. Ask me about altitude, velocity, gas level, acceleration, or mission duration.`;
}

module.exports = router;
