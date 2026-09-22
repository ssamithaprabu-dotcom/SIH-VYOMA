---
category: sensors
sensor: Battery monitoring
fault_id: LOW_BATTERY
---

# Battery Voltage Monitoring & Power System

## Overview
The avionics system power rail is monitored via an analog resistive voltage divider connected to an ADC pin.

## Voltage Threshold Guidelines
- Nominal 1S LiPo Voltage: 3.7V - 4.2V
- Low Voltage Warning: 3.4V (PLACEHOLDER - to be validated by the team)
- Critical Cutoff Threshold: 3.2V

## Troubleshooting Procedures
If battery drops below 3.4V during flight, reduce ground telemetry transmitter power if possible and ensure microSD onboard data logging remains powered.
