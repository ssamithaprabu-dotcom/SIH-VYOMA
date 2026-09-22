from pydantic import BaseModel, Field
from typing import Optional

class Mpu6050Data(BaseModel):
    ax: float = 0.0
    ay: float = 0.0
    az: float = 0.0
    gx: float = 0.0
    gy: float = 0.0
    gz: float = 0.0

class Bmp280Data(BaseModel):
    pressure: float = 0.0
    altitude: float = 0.0

class GpsData(BaseModel):
    latitude: float = 0.0
    longitude: float = 0.0
    speed: float = 0.0
    fix: bool = True

class BatteryData(BaseModel):
    voltage: float = 0.0

class CommsData(BaseModel):
    status: str = "OK"

class RecoveryData(BaseModel):
    status: str = "ARMED"

class LoggingData(BaseModel):
    sd_status: str = "OK"

class TelemetryPayload(BaseModel):
    timestamp: str = ""
    flight_id: str = "FLIGHT-001"
    flight_phase: str = "ASCENT"
    mpu6050: Optional[Mpu6050Data] = Field(default_factory=Mpu6050Data)
    bmp280: Optional[Bmp280Data] = Field(default_factory=Bmp280Data)
    gps: Optional[GpsData] = Field(default_factory=GpsData)
    battery: Optional[BatteryData] = Field(default_factory=BatteryData)
    comms: Optional[CommsData] = Field(default_factory=CommsData)
    recovery: Optional[RecoveryData] = Field(default_factory=RecoveryData)
    logging: Optional[LoggingData] = Field(default_factory=LoggingData)
