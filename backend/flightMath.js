// VYOMA's current sensor set (DHT22 + MQ-09 + flame + MPU6050) has no
// barometer, so "altitude" here is estimated by double-integrating the
// IMU's acceleration. That drifts over anything longer than a short
// flight - it's a stand-in until BMP280 lands in Phase 2, and the
// dashboard is expected to say so, not hide it.

const GRAVITY = 9.81;
const RAD2DEG = 180 / Math.PI;

// One tracker per mission so restarting a mission resets the drift.
const trackers = {};

function getTracker(missionId) {
  if (!trackers[missionId]) {
    trackers[missionId] = {
      lastTs: null,
      velocity: 0, // m/s, vertical estimate
      altitude: 0, // m, vertical estimate
      roll: 0,
      pitch: 0,
      yaw: 0,
      restCounter: 0,
    };
  }
  return trackers[missionId];
}

function resetTracker(missionId) {
  delete trackers[missionId];
}

// accel: {x,y,z} in m/s^2, gyro: {x,y,z} in deg/s
function update(missionId, accel, gyro, timestampMs) {
  const t = getTracker(missionId);
  const dt = t.lastTs ? Math.min((timestampMs - t.lastTs) / 1000, 0.5) : 0;
  t.lastTs = timestampMs;

  const accelMag = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);

  // --- Orientation: complementary filter (98% gyro integration, 2% accel) ---
  const accelPitch = Math.atan2(accel.y, Math.sqrt(accel.x ** 2 + accel.z ** 2)) * RAD2DEG;
  const accelRoll = Math.atan2(-accel.x, accel.z) * RAD2DEG;

  if (dt > 0) {
    t.pitch = 0.98 * (t.pitch + gyro.x * dt) + 0.02 * accelPitch;
    t.roll = 0.98 * (t.roll + gyro.y * dt) + 0.02 * accelRoll;
    t.yaw = t.yaw + gyro.z * dt; // no magnetometer to correct yaw drift
  }

  // --- Altitude / velocity: simple vertical double-integration with a
  // rough zero-velocity update (ZUPT) so a stationary rocket doesn't
  // slowly "climb" from sensor noise. ---
  const nearRest = Math.abs(accelMag - GRAVITY) < 0.35 &&
    Math.abs(gyro.x) < 3 && Math.abs(gyro.y) < 3 && Math.abs(gyro.z) < 3;
  t.restCounter = nearRest ? t.restCounter + 1 : 0;

  if (dt > 0) {
    const verticalAccel = accelMag - GRAVITY;
    t.velocity += verticalAccel * dt;
    if (t.restCounter > 8) t.velocity = 0; // settled -> cancel drift
    t.altitude += t.velocity * dt;
    if (t.altitude < 0) t.altitude = 0;
  }

  return {
    orientation: { roll: round2(t.roll), pitch: round2(t.pitch), yaw: round2(t.yaw) },
    velocity: round2(t.velocity),
    altitude: round2(t.altitude),
    accelMagnitude: round2(accelMag),
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function classifyGas(value, thresholds) {
  if (value >= thresholds.danger) return "high";
  if (value >= thresholds.warn) return "medium";
  return "low";
}

module.exports = { update, resetTracker, classifyGas };
