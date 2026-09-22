// Small file-based data store. VYOMA is a student project running on a
// laptop next to a rocket rig, not a production server - a real database
// engine would just be one more thing to install and debug on launch day.
// This module keeps everything in memory for speed and mirrors it to
// plain JSON files on disk so nothing is lost between runs.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const FILES = {
  users: path.join(DATA_DIR, "users.json"),
  missions: path.join(DATA_DIR, "missions.json"),
  settings: path.join(DATA_DIR, "settings.json"),
  meta: path.join(DATA_DIR, "meta.json"),
};

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf-8");
    return raw.trim() ? JSON.parse(raw) : fallback;
  } catch (err) {
    console.error(`Could not read ${file}, using default.`, err.message);
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const DEFAULT_SETTINGS = {
  mode: "SIMULATION", // LIVE or SIMULATION
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
  thresholds: {
    mq09: { low: 200, normal: 300, high: 500, critical: 800 },
    mq135: { low: 200, normal: 300, high: 500, critical: 800 }
  },
};

const meta = readJSON(FILES.meta, { currentMissionId: null });

const state = {
  users: readJSON(FILES.users, []),
  missions: readJSON(FILES.missions, []),
  settings: readJSON(FILES.settings, DEFAULT_SETTINGS),
  currentMissionId: meta.currentMissionId,
  // telemetry lives only in memory, keyed by mission id, capped per mission
  telemetry: {},
};

const MAX_POINTS_PER_MISSION = 4000;

function persistUsers() {
  writeJSON(FILES.users, state.users);
}
function persistMissions() {
  writeJSON(FILES.missions, state.missions);
  writeJSON(FILES.meta, { currentMissionId: state.currentMissionId });
}
function persistSettings() {
  writeJSON(FILES.settings, state.settings);
}

function telemetryLogPath(missionId) {
  return path.join(DATA_DIR, `telemetry_${missionId}.jsonl`);
}

function appendTelemetryToDisk(missionId, point) {
  fs.appendFileSync(telemetryLogPath(missionId), JSON.stringify(point) + "\n");
}

function addTelemetry(missionId, point) {
  if (!state.telemetry[missionId]) state.telemetry[missionId] = [];
  const arr = state.telemetry[missionId];
  arr.push(point);
  if (arr.length > MAX_POINTS_PER_MISSION) arr.shift();
  appendTelemetryToDisk(missionId, point);
}

function getTelemetry(missionId, limit) {
  const arr = state.telemetry[missionId] || [];
  if (!limit) return arr;
  return arr.slice(Math.max(0, arr.length - limit));
}

function getLatestTelemetry(missionId) {
  const arr = state.telemetry[missionId] || [];
  return arr.length ? arr[arr.length - 1] : null;
}

module.exports = {
  state,
  persistUsers,
  persistMissions,
  persistSettings,
  addTelemetry,
  getTelemetry,
  getLatestTelemetry,
  DEFAULT_SETTINGS,
};
