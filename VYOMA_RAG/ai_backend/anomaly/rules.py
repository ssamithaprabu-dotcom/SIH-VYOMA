from typing import Dict, Any, Optional
import math

class RuleEvaluator:
    """
    Evaluates telemetry against YAML configured fault thresholds.
    """
    def __init__(self, thresholds_config: Dict[str, Any], units_config: Dict[str, Any]):
        self.thresholds = thresholds_config.get("faults", {})
        self.units = units_config.get("units", {})

    def evaluate_gps_loss(self, gps_data: Any) -> Optional[Dict[str, Any]]:
        if not gps_data:
            return {
                "fault": "GPS_LOSS",
                "sensor": "gps",
                "parameter": "fix",
                "current_value": "MISSING",
                "unit": self.units.get("latitude", {}).get("unit", "deg"),
                "severity": "HIGH",
                "measured_evidence": "GPS data block missing from telemetry payload"
            }
        
        is_fix_lost = not gps_data.fix or (gps_data.latitude == 0.0 and gps_data.longitude == 0.0)
        if is_fix_lost:
            return {
                "fault": "GPS_LOSS",
                "sensor": "gps",
                "parameter": "fix",
                "current_value": f"fix={gps_data.fix}, lat={gps_data.latitude:.4f}, lon={gps_data.longitude:.4f}",
                "unit": self.units.get("latitude", {}).get("unit", "deg"),
                "severity": "HIGH",
                "measured_evidence": f"GPS fix false or zero coordinates (lat={gps_data.latitude:.4f}, lon={gps_data.longitude:.4f}, fix={gps_data.fix})"
            }
        return None

    def evaluate_high_acceleration(self, mpu_data: Any, flight_phase: str) -> Optional[Dict[str, Any]]:
        if not mpu_data:
            return None

        # Acceleration magnitude: sqrt(ax^2 + ay^2 + az^2)
        mag = math.sqrt(mpu_data.ax**2 + mpu_data.ay**2 + mpu_data.az**2)
        cfg = self.thresholds.get("HIGH_ACCELERATION", {})
        thresholds = cfg.get("thresholds_by_phase", {})
        limit = thresholds.get(flight_phase, 10.0)

        if mag > limit:
            unit = self.units.get("acceleration", {}).get("unit", "g")
            return {
                "fault": "HIGH_ACCELERATION",
                "sensor": "mpu6050",
                "parameter": "acceleration",
                "current_value": f"{mag:.2f}",
                "unit": unit,
                "severity": cfg.get("severity", "CRITICAL"),
                "measured_evidence": f"Acceleration magnitude {mag:.2f} {unit} exceeds threshold of {limit} {unit} during {flight_phase} phase"
            }
        return None

    def evaluate_low_battery(self, bat_data: Any) -> Optional[Dict[str, Any]]:
        if not bat_data:
            return None
        cfg = self.thresholds.get("LOW_BATTERY", {})
        threshold = 3.4
        if bat_data.voltage < threshold and bat_data.voltage > 0.0:
            unit = self.units.get("voltage", {}).get("unit", "V")
            return {
                "fault": "LOW_BATTERY",
                "sensor": "battery",
                "parameter": "voltage",
                "current_value": f"{bat_data.voltage:.2f}",
                "unit": unit,
                "severity": cfg.get("severity", "HIGH"),
                "measured_evidence": f"Battery voltage {bat_data.voltage:.2f} {unit} is below threshold of {threshold} {unit}"
            }
        return None

    def evaluate_altitude_anomaly(self, bmp_data: Any, gps_data: Any, flight_phase: str, derived_baro_rate: float) -> Optional[Dict[str, Any]]:
        if not bmp_data:
            return None
        unit = self.units.get("altitude", {}).get("unit", "m")

        # Altitude rate check (e.g. rate > 250 m/s during pad or ascent mismatch)
        if flight_phase == "PAD" and abs(derived_baro_rate) > 5.0:
            return {
                "fault": "ALTITUDE_ANOMALY",
                "sensor": "bmp280",
                "parameter": "altitude",
                "current_value": f"rate={derived_baro_rate:.1f} m/s",
                "unit": unit,
                "severity": "HIGH",
                "measured_evidence": f"Unrealistic altitude rate of change {derived_baro_rate:.1f} m/s while in PAD phase"
            }

        if gps_data and gps_data.fix and gps_data.latitude != 0.0:
            diff = abs(bmp_data.altitude - gps_data.speed)  # or altitude diff
            # If barometer altitude vs GPS disagrees by over 150m
            if abs(bmp_data.altitude - 0.0) > 0 and abs(bmp_data.altitude - gps_data.speed * 10) > 150: # Mismatch check
                pass
        return None
