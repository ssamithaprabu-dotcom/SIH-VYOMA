import httpx
import asyncio
import sys
import time

TARGET_URL = "http://localhost:8000/telemetry"

def generate_base_sample(flight_phase="ASCENT", step=0):
    return {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "flight_id": "FLIGHT-SIM-01",
        "flight_phase": flight_phase,
        "mpu6050": {
            "ax": 0.2,
            "ay": 0.1,
            "az": 1.0 + (step * 0.2 if flight_phase == "ASCENT" else 0.0),
            "gx": 0.5,
            "gy": 0.2,
            "gz": 0.1
        },
        "bmp280": {
            "pressure": max(100.0, 1013.25 - (step * 10.0)),
            "altitude": 10.0 + (step * 50.0)
        },
        "gps": {
            "latitude": 12.9716 + (step * 0.0001),
            "longitude": 77.5946 + (step * 0.0001),
            "speed": 15.0 + (step * 2.0),
            "fix": True
        },
        "battery": {
            "voltage": 3.9
        },
        "comms": {"status": "OK"},
        "recovery": {"status": "ARMED"},
        "logging": {"sd_status": "OK"}
    }

async def run_scenario(scenario_name: str, sample_count: int = 5, delay_sec: float = 1.0):
    print(f"\n--- Running Scenario: {scenario_name.upper()} ---")
    async with httpx.AsyncClient() as client:
        for i in range(sample_count):
            sample = generate_base_sample(
                flight_phase="ASCENT" if "ascent" in scenario_name or "gps" in scenario_name else "DESCENT",
                step=i
            )

            # Scenario Fault Injections
            if scenario_name == "gps_loss":
                sample["gps"]["fix"] = False
                sample["gps"]["latitude"] = 0.0
                sample["gps"]["longitude"] = 0.0
            elif scenario_name == "high_acceleration":
                sample["mpu6050"]["ax"] = 10.0
                sample["mpu6050"]["ay"] = 12.0
                sample["mpu6050"]["az"] = 14.0 # mag = 21.0g > 15g threshold
            elif scenario_name == "low_battery":
                sample["battery"]["voltage"] = 3.1
            elif scenario_name == "abnormal_altitude":
                sample["flight_phase"] = "PAD"
                sample["bmp280"]["altitude"] = 500.0 + (i * 100.0)
            elif scenario_name == "sensor_disconnection":
                sample.pop("mpu6050", None)
            elif scenario_name == "multiple_anomalies":
                sample["gps"]["fix"] = False
                sample["gps"]["latitude"] = 0.0
                sample["mpu6050"]["ax"] = 12.0
                sample["mpu6050"]["ay"] = 12.0
                sample["mpu6050"]["az"] = 12.0

            try:
                res = await client.post(TARGET_URL, json=sample)
                print(f"[{i+1}/{sample_count}] Sent telemetry sample -> Status: {res.status_code}, Alerts: {len(res.json().get('alerts_triggered', []))}")
            except Exception as e:
                print(f"[{i+1}/{sample_count}] Connection error: {e}")
            await asyncio.sleep(delay_sec)

if __name__ == "__main__":
    scenarios = [
        "normal_ascent",
        "normal_descent",
        "gps_loss",
        "high_acceleration",
        "low_battery",
        "abnormal_altitude",
        "sensor_disconnection",
        "multiple_anomalies"
    ]

    selected = sys.argv[1] if len(sys.argv) > 1 else "gps_loss"
    if selected not in scenarios and selected != "all":
        print(f"Unknown scenario '{selected}'. Available: {scenarios} or 'all'")
        sys.exit(1)

    if selected == "all":
        for s in scenarios:
            asyncio.run(run_scenario(s, sample_count=3, delay_sec=0.5))
    else:
        asyncio.run(run_scenario(selected, sample_count=5, delay_sec=1.0))
