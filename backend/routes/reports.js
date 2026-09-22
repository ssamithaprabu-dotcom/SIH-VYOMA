const express = require("express");
const PDFDocument = require("pdfkit");
const { db } = require("../database");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/:missionId/pdf", (req, res) => {
  const missionId = req.params.missionId;
  
  db.get("SELECT * FROM missions WHERE id = ?", [missionId], (err, mission) => {
    if (err || !mission) return res.status(404).json({ error: "Mission not found." });

    db.all("SELECT * FROM telemetry WHERE mission_id = ? ORDER BY timestamp ASC", [missionId], (err, points) => {
      
      db.get(`SELECT 
        MAX(altitude) as maxAltitude, 
        MAX(ABS(velocity)) as maxVelocity,
        MAX(MAX(ABS(accel_x), ABS(accel_y), ABS(accel_z))) as maxAccel,
        MAX(MAX(ABS(gyro_x), ABS(gyro_y), ABS(gyro_z))) as maxGyro,
        MIN(temperature) as minTemp, MAX(temperature) as maxTemp,
        MIN(humidity) as minHum, MAX(humidity) as maxHum,
        MIN(mq9) as minMq09, MAX(mq9) as maxMq09,
        MIN(mq135) as minMq135, MAX(mq135) as maxMq135
        FROM telemetry WHERE mission_id = ?`, [missionId], (err, stats) => {
        
        mission.maxAltitude = stats?.maxAltitude || 0;
        mission.maxVelocity = stats?.maxVelocity || 0;
        mission.maxAccel = stats?.maxAccel || 0;
        mission.maxGyro = stats?.maxGyro || 0;
        
        db.all("SELECT * FROM alerts WHERE mission_id = ? ORDER BY timestamp ASC", [missionId], (err, alertsRow) => {
          const alerts = alertsRow || [];
          const flameCount = alerts.filter(a => a.sensor === 'Flame').length;

        const durationSec = points.length > 0 
          ? (new Date(points[points.length-1].timestamp).getTime() - new Date(points[0].timestamp).getTime()) / 1000
          : 0;

        const doc = new PDFDocument({ margin: 50 });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${mission.name.replace(/\s+/g, "_")}_report.pdf"`);
        doc.pipe(res);

        doc.fontSize(20).text("VYOMA Flight Report", { align: "left" });
        doc.moveDown(0.3);
        doc.fontSize(11).fillColor("#555").text("Open reusable rocket/CanSat avionics kit - SIH26226");
        doc.fillColor("#000").moveDown(1);

        doc.fontSize(14).text(`Mission: ${mission.name}`);
        doc.fontSize(10).text(`ID: ${mission.id}   |   Operator: ${mission.operator || 'Unknown'}`);
        doc.text(`Started: ${new Date(mission.start_time).toLocaleString()}`);
        doc.text(`Duration: ${durationSec.toFixed(1)} s   |   Final Status: ${mission.status}`);
        doc.moveDown(1);

        const rows = [
          ["Max altitude", `${mission.maxAltitude.toFixed(2)} m`],
          ["Max velocity", `${mission.maxVelocity.toFixed(2)} m/s`],
          ["Max acceleration", `${mission.maxAccel.toFixed(2)} g`],
          ["Max angular velocity", `${mission.maxGyro.toFixed(2)} °/s`],
          ["Temperature Range", `${stats?.minTemp || '--'} °C to ${stats?.maxTemp || '--'} °C`],
          ["Humidity Range", `${stats?.minHum || '--'} % to ${stats?.maxHum || '--'} %`],
          ["MQ-09 Range", `${stats?.minMq09 || '--'} to ${stats?.maxMq09 || '--'}`],
          ["MQ-135 Range", `${stats?.minMq135 || '--'} to ${stats?.maxMq135 || '--'}`],
          ["Flame Events Detected", String(flameCount)],
          ["Telemetry points logged", String(points.length)]
        ];

        doc.fontSize(12).text("Flight summary", { underline: true });
        doc.moveDown(0.5);
        rows.forEach(([label, value]) => {
          doc.fontSize(10).text(`${label}:`, { continued: true, width: 250 }).text(`  ${value}`);
        });

        doc.moveDown(1);
        doc.fontSize(12).text("Mission Events Timeline", { underline: true });
        doc.moveDown(0.5);
        if (alerts.length === 0) {
          doc.fontSize(10).text("No critical events recorded during this mission.");
        } else {
          alerts.forEach(a => {
            const time = new Date(a.timestamp).toLocaleTimeString();
            doc.fontSize(10).text(`${time} - [${a.severity}] ${a.sensor}: ${a.message}`);
          });
        }

        doc.moveDown(2);
        doc.fontSize(9).fillColor("#777").text(
          "Note: altitude and velocity are estimated by integrating IMU acceleration " +
            "until BMP280 barometric altitude is added in Phase 2. Detailed visual telemetry graphs can be viewed natively in the VYOMA Mission Archive Dashboard."
        );

        doc.end();
        });
      });
    });
  });
});

module.exports = router;
