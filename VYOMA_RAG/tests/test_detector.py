from ai_backend.anomaly.detector import AnomalyDetector
from ai_backend.models.telemetry import TelemetryPayload, GpsData, Mpu6050Data, Bmp280Data, BatteryData

def test_gps_loss_fault_detection():
    detector = AnomalyDetector()
    payload = TelemetryPayload(
        flight_phase="ASCENT",
        gps=GpsData(latitude=0.0, longitude=0.0, fix=False)
    )
    # Send samples to satisfy persistence window (3 samples)
    detector.detect(payload)
    detector.detect(payload)
    faults = detector.detect(payload)
    assert len(faults) == 1
    assert faults[0].fault == "GPS_LOSS"
    assert faults[0].sensor == "gps"

def test_high_acceleration_fault_detection():
    detector = AnomalyDetector()
    payload = TelemetryPayload(
        flight_phase="PAD",
        mpu6050=Mpu6050Data(ax=2.0, ay=2.0, az=2.0)  # mag = ~3.46g > 1.5g PAD threshold
    )
    # Send samples to satisfy persistence window (2 samples)
    detector.detect(payload)
    faults = detector.detect(payload)
    assert len(faults) >= 1
    accel_faults = [f for f in faults if f.fault == "HIGH_ACCELERATION"]
    assert len(accel_faults) == 1
    assert accel_faults[0].severity == "CRITICAL"

def test_derived_velocity_calculation():
    detector = AnomalyDetector()
    p1 = TelemetryPayload(bmp280=Bmp280Data(altitude=100.0))
    detector.calculate_derived_velocity(p1, current_time=1000.0)

    p2 = TelemetryPayload(bmp280=Bmp280Data(altitude=200.0))
    gps_speed, baro_rate = detector.calculate_derived_velocity(p2, current_time=1002.0)
    assert baro_rate == 50.0  # (200 - 100) / 2.0 = 50 m/s
