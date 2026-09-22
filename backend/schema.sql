CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS missions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    operator VARCHAR(255) DEFAULT 'VYOMA CONTROL',
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NULL,
    status VARCHAR(50) DEFAULT 'IDLE'
);

CREATE TABLE IF NOT EXISTS global_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(255) NOT NULL UNIQUE,
    setting_value TEXT
);

CREATE TABLE IF NOT EXISTS mission_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id VARCHAR(255) NOT NULL,
    setting_key VARCHAR(255) NOT NULL,
    setting_value TEXT,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sensors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id VARCHAR(255) NOT NULL,
    sensor_name VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    connected BOOLEAN DEFAULT FALSE,
    last_data DATETIME NULL,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS telemetry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id VARCHAR(255) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    pressure REAL NULL,
    altitude REAL NULL,
    velocity REAL NULL,
    acceleration REAL NULL,
    accel_x REAL NULL,
    accel_y REAL NULL,
    accel_z REAL NULL,
    roll REAL NULL,
    pitch REAL NULL,
    yaw REAL NULL,
    gyro_x REAL NULL,
    gyro_y REAL NULL,
    gyro_z REAL NULL,
    temperature REAL NULL,
    humidity REAL NULL,
    gas_raw REAL NULL,
    gas_concentration REAL NULL,
    gas_status VARCHAR(50) NULL,
    flame_detected BOOLEAN DEFAULT FALSE,
    mq09 REAL NULL,
    mq135 REAL NULL,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mission_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id VARCHAR(255) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    sensor VARCHAR(255) NULL,
    severity VARCHAR(50) DEFAULT 'INFO',
    message TEXT NOT NULL,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mission_id VARCHAR(255) NOT NULL,
    connection_type VARCHAR(50) DEFAULT 'LIVE',
    connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    disconnected_at DATETIME NULL,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(255) PRIMARY KEY,
    mission_id VARCHAR(255) NOT NULL,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    report_data TEXT,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);
