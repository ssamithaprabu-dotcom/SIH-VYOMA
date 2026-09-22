const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing login token." });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Session expired, please log in again." });
  }
}

// Separate, lighter check for the ESP8266 posting telemetry - it can't
// do a login flow, so it just proves it belongs on this network with a
// shared key instead.
function requireDeviceKey(req, res, next) {
  const key = req.headers["x-device-key"];
  if (!key || key !== process.env.DEVICE_KEY) {
    return res.status(401).json({ error: "Invalid or missing device key." });
  }
  next();
}

module.exports = { requireAuth, requireDeviceKey };
