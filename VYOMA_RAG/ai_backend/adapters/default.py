from ai_backend.models.telemetry import TelemetryPayload, Mpu6050Data, Bmp280Data, GpsData, BatteryData, CommsData, RecoveryData, LoggingData
from ai_backend.config import settings
from typing import Dict, Any, Tuple
import time

class TelemetryAdapter:
    def __init__(self, field_map_path: str = "config/field_map.yaml", units_path: str = "config/units.yaml"):
        self.field_mapping = settings.load_yaml_config(field_map_path).get("field_mapping", {})
        self.units_config = settings.load_yaml_config(units_path).get("units", {})

    def adapt(self, raw_payload: Dict[str, Any]) -> TelemetryPayload:
        """
        Converts raw payload (either standard Contract v1 or custom hardware format)
        into internal TelemetryPayload model.
        """
        if not raw_payload.get("timestamp"):
            raw_payload["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        # If payload already matches Contract v1 structure, try parsing directly
        try:
            return TelemetryPayload.model_validate(raw_payload)
        except Exception:
            pass

        # Otherwise map fields from field_mapping config
        mpu_raw = raw_payload.get("mpu6050", raw_payload.get("imu", {}))
        mpu_map = self.field_mapping.get("mpu6050", {})
        mpu_data = Mpu6050Data(
            ax=float(mpu_raw.get(mpu_map.get("accel_x", "ax"), mpu_raw.get("ax", 0.0))),
            ay=float(mpu_raw.get(mpu_map.get("accel_y", "ay"), mpu_raw.get("ay", 0.0))),
            az=float(mpu_raw.get(mpu_map.get("accel_z", "az"), mpu_raw.get("az", 0.0))),
            gx=float(mpu_raw.get(mpu_map.get("gyro_x", "gx"), mpu_raw.get("gx", 0.0))),
            gy=float(mpu_raw.get(mpu_map.get("gyro_y", "gy"), mpu_raw.get("gy", 0.0))),
            gz=float(mpu_raw.get(mpu_map.get("gyro_z", "gz"), mpu_raw.get("gz", 0.0))),
        )

        bmp_raw = raw_payload.get("bmp280", raw_payload.get("baro", {}))
        bmp_map = self.field_mapping.get("bmp280", {})
        bmp_data = Bmp280Data(
            pressure=float(bmp_raw.get(bmp_map.get("press", "pressure"), bmp_raw.get("pressure", 0.0))),
            altitude=float(bmp_raw.get(bmp_map.get("alt", "altitude"), bmp_raw.get("altitude", 0.0))),
        )

        gps_raw = raw_payload.get("gps", {})
        gps_map = self.field_mapping.get("gps", {})
        gps_data = GpsData(
            latitude=float(gps_raw.get(gps_map.get("lat", "latitude"), gps_raw.get("latitude", 0.0))),
            longitude=float(gps_raw.get(gps_map.get("lon", "longitude"), gps_raw.get("longitude", 0.0))),
            speed=float(gps_raw.get(gps_map.get("spd", "speed"), gps_raw.get("speed", 0.0))),
            fix=bool(gps_raw.get(gps_map.get("status", "fix"), gps_raw.get("fix", True))),
        )

        bat_raw = raw_payload.get("battery", {})
        bat_map = self.field_mapping.get("battery", {})
        bat_data = BatteryData(
            voltage=float(bat_raw.get(bat_map.get("v_bat", "voltage"), bat_raw.get("voltage", 0.0)))
        )

        return TelemetryPayload(
            timestamp=str(raw_payload.get("timestamp", "")),
            flight_id=str(raw_payload.get("flight_id", "FLIGHT-001")),
            flight_phase=str(raw_payload.get("flight_phase", "ASCENT")).upper(),
            mpu6050=mpu_data,
            bmp280=bmp_data,
            gps=gps_data,
            battery=bat_data,
            comms=CommsData(**raw_payload.get("comms", {})) if raw_payload.get("comms") else CommsData(),
            recovery=RecoveryData(**raw_payload.get("recovery", {})) if raw_payload.get("recovery") else RecoveryData(),
            logging=LoggingData(**raw_payload.get("logging", {})) if raw_payload.get("logging") else LoggingData(),
        )

    def get_unit(self, parameter: str) -> str:
        return self.units_config.get(parameter, {}).get("unit", "")
