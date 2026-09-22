---
category: faults
sensor: NEO-6M GPS
fault_id: GPS_LOSS
---

# Fault Procedure: GPS_LOSS (GPS Lock Loss)

## Symptom Description
The telemetry monitoring engine detects `GPS_LOSS` when `fix == False` or coordinates return zero (`0.0, 0.0`) during active flight phases (PAD, ASCENT, COAST, DESCENT).

## Measured Evidence Grounding
Loss of GPS navigation payload signals: sat fix indicator lost or lat/lon coordinates zeroed out.

## Potential Root Causes
- Mechanical antenna disconnection caused by flight vibration.
- Metal/CFRP rocket body shadowing GPS patch antenna orientation.
- High velocity/acceleration dynamics exceeding standard terrestrial u-blox dynamics mode.
- Electrical noise or LoRa transmitter harmonic interference.

## Recommended Corrective Action Procedure
1. Ground Control Software: Mark GPS positional data as suspect in ground telemetry stream (`MARK_SENSOR_SUSPECT`).
2. Primary Telemetry Display: Display secondary barometric altitude graph (`SHOW_BACKUP_ALTITUDE_SOURCE`).
3. Ground Operator Notice: Prompt operator to monitor LoRa telemetry RSSI (`REQUEST_OPERATOR_ACK`).
4. Note: Flight computer recovery parachutes operate on independent baro/acceleration sensors; do not attempt remote flight computer reboots during flight.
