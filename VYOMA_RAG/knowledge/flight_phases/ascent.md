---
category: flight_phases
sensor: system
fault_id: ASCENT_PHASE
---

# Flight Phase Documentation: ASCENT

## Definition & Dynamics
ASCENT phase begins upon rocket motor ignition and launch rod exit. Characterized by high thrust acceleration (typically 5g - 15g, PLACEHOLDER - to be validated by the team), rapid barometric pressure drop, and high acoustic vibration.

## Expected Sensor Profiles
- MPU6050 IMU: High acceleration magnitude along Z/longitudinal axis.
- BMP280 Barometer: Rapidly decreasing pressure and rapidly increasing altitude.
- NEO-6M GPS: Rapidly increasing altitude and vertical velocity.

## Special Monitoring Instructions
GPS signal lock may drop temporarily during motor burn acceleration due to RF dynamics or structural vibration. Barometric altitude and IMU acceleration serve as secondary tracking.
