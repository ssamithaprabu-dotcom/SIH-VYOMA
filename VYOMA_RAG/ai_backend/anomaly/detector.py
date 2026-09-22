from typing import Dict, Any, List, Optional, Tuple
from ai_backend.models.telemetry import TelemetryPayload
from ai_backend.anomaly.rules import RuleEvaluator
from ai_backend.config import settings
import time

class DetectedFault:
    def __init__(self, fault: str, sensor: str, parameter: str, current_value: str, unit: str,
                 severity: str, measured_evidence: str, flight_phase: str, flight_id: str, timestamp: str):
        self.fault = fault
        self.sensor = sensor
        self.parameter = parameter
        self.current_value = current_value
        self.unit = unit
        self.severity = severity
        self.measured_evidence = measured_evidence
        self.flight_phase = flight_phase
        self.flight_id = flight_id
        self.timestamp = timestamp

class AnomalyDetector:
    """
    Layer 1 Real-time deterministic fault detection engine.
    - Phase-aware rules
    - Derived velocity calculation (GPS speed and rate of change of baro altitude, NO accelerometer integration)
    - Persistence window (samples and time ms)
    - Cooldown management
    """
    def __init__(self, config_dir: str = "config"):
        thresholds_path = f"{config_dir}/thresholds.yaml"
        units_path = f"{config_dir}/units.yaml"
        self.thresholds_cfg = settings.load_yaml_config(thresholds_path)
        self.units_cfg = settings.load_yaml_config(units_path)
        self.rules = RuleEvaluator(self.thresholds_cfg, self.units_cfg)

        # State tracking for derived velocity and persistence
        self.last_altitude: Optional[float] = None
        self.last_alt_timestamp: Optional[float] = None
        self.fault_sample_counts: Dict[str, int] = {}
        self.fault_first_seen_time: Dict[str, float] = {}
        self.fault_last_triggered_time: Dict[str, float] = {}

    def calculate_derived_velocity(self, payload: TelemetryPayload, current_time: float) -> Tuple[float, float]:
        """
        Derives velocity ONLY from:
        1. GPS speed directly
        2. Rate of change of barometric altitude (delta_altitude / delta_time)
        NEVER integrates raw accelerometer data.
        """
        gps_speed = payload.gps.speed if (payload.gps and payload.gps.fix) else 0.0
        baro_rate = 0.0

        if payload.bmp280:
            current_alt = payload.bmp280.altitude
            if self.last_altitude is not None and self.last_alt_timestamp is not None:
                dt = current_time - self.last_alt_timestamp
                if dt > 0.05:  # Avoid division by micro-intervals
                    baro_rate = (current_alt - self.last_altitude) / dt
            self.last_altitude = current_alt
            self.last_alt_timestamp = current_time

        return gps_speed, baro_rate

    def detect(self, payload: TelemetryPayload) -> List[DetectedFault]:
        now = time.time()
        gps_speed, baro_rate = self.calculate_derived_velocity(payload, now)
        raw_faults: List[Dict[str, Any]] = []

        # 1. Evaluate GPS LOSS rule (Primary Vertical Slice)
        gps_fault = self.rules.evaluate_gps_loss(payload.gps)
        if gps_fault:
            raw_faults.append(gps_fault)

        # 2. Evaluate HIGH ACCELERATION rule
        accel_fault = self.rules.evaluate_high_acceleration(payload.mpu6050, payload.flight_phase)
        if accel_fault:
            raw_faults.append(accel_fault)

        # 3. Evaluate LOW BATTERY rule
        bat_fault = self.rules.evaluate_low_battery(payload.battery)
        if bat_fault:
            raw_faults.append(bat_fault)

        # 4. Evaluate ALTITUDE ANOMALY rule
        alt_fault = self.rules.evaluate_altitude_anomaly(payload.bmp280, payload.gps, payload.flight_phase, baro_rate)
        if alt_fault:
            raw_faults.append(alt_fault)

        # Apply persistence windows and debouncing/cooldown
        active_faults: List[DetectedFault] = []
        fault_cfgs = self.thresholds_cfg.get("faults", {})

        current_active_keys = set()
        for f in raw_faults:
            fault_key = f"{f['sensor']}_{f['fault']}"
            current_active_keys.add(fault_key)
            cfg = fault_cfgs.get(f['fault'], {})

            # Persistence window tracking
            if fault_key not in self.fault_sample_counts:
                self.fault_sample_counts[fault_key] = 1
                self.fault_first_seen_time[fault_key] = now
            else:
                self.fault_sample_counts[fault_key] += 1

            sample_count = self.fault_sample_counts[fault_key]
            first_seen = self.fault_first_seen_time[fault_key]
            duration_ms = (now - first_seen) * 1000.0

            required_samples = cfg.get("persistence_samples", 1)
            required_window_ms = cfg.get("persistence_window_ms", 0)

            # Check if persistence criteria met
            if sample_count >= required_samples or duration_ms >= required_window_ms:
                # Check cooldown period
                last_triggered = self.fault_last_triggered_time.get(fault_key, 0.0)
                cooldown_sec = cfg.get("cooldown_seconds", 10)

                if (now - last_triggered) >= cooldown_sec or sample_count == required_samples:
                    self.fault_last_triggered_time[fault_key] = now
                    active_faults.append(DetectedFault(
                        fault=f['fault'],
                        sensor=f['sensor'],
                        parameter=f['parameter'],
                        current_value=f['current_value'],
                        unit=f['unit'],
                        severity=f['severity'],
                        measured_evidence=f['measured_evidence'],
                        flight_phase=payload.flight_phase,
                        flight_id=payload.flight_id,
                        timestamp=payload.timestamp
                    ))

        # Reset counters for cleared faults
        for k in list(self.fault_sample_counts.keys()):
            if k not in current_active_keys:
                del self.fault_sample_counts[k]
                if k in self.fault_first_seen_time:
                    del self.fault_first_seen_time[k]

        return active_faults
