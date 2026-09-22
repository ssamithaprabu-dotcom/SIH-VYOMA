---
category: faults
sensor: MPU6050 IMU
fault_id: HIGH_ACCELERATION
---

# Fault Procedure: HIGH_ACCELERATION

## Symptom Description
High acceleration occurs when IMU magnitude exceeds phase limits (e.g., >15g during ASCENT or >1.5g while on PAD).

## Potential Root Causes
- Motor thrust spike or mechanical vibration resonance.
- Unstabilized tumbling during COAST phase.
- Hard shock during recovery deployment.

## Corrective Action Procedure
1. Verify structural telemetry stability.
2. Confirm IMU gyroscopic orientation consistency (`MARK_SENSOR_SUSPECT`).
3. Request operator acknowledgment if tumbling persists (`REQUEST_OPERATOR_ACK`).
