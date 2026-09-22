---
category: faults
sensor: Battery monitoring
fault_id: LOW_BATTERY
---

# Fault Procedure: LOW_BATTERY

## Symptom Description
Battery voltage drops below 3.4V threshold.

## Potential Root Causes
- Depleted LiPo battery pack.
- Excessive LoRa RF transmission power drain.
- Short circuit or high current load on 3.3V rail.

## Corrective Action Procedure
1. Require ground station operator acknowledgment (`REQUEST_OPERATOR_ACK`).
2. Ensure backup data logging remains prioritized (`REQUEST_RECALIBRATION_REMINDER`).
