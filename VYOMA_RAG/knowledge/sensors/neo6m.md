---
category: sensors
sensor: NEO-6M GPS
fault_id: GPS_LOSS
---

# NEO-6M GPS Module Specification & Diagnostics

## Overview
The NEO-6M is a standalone GPS receiver module with high-performance u-blox 6 positioning engine. It communicates via UART interface using NMEA-0183 protocol.

## Operating Characteristics
- Supply Voltage: 2.7V to 3.6V (typically powered via 3.3V LDO)
- Communication Protocol: UART (default 9600 baud rate)
- Navigation Update Rate: 1 Hz to 5 Hz
- Time-To-First-Fix (TTFF):
  - Cold Start: ~27 seconds
  - Hot Start: ~1 second

## Common Failure Modes & Hardware Behavior
1. Antenna Disconnection or Shielding: Loss of satellite satellite lock leads to NMEA fix flag turning false (`fix=False`) or returning default zero coordinates (`lat=0.0, lon=0.0`).
2. High Acceleration / Dynamics: Rapid angular changes during rocket ascent or coast phase can exceed the module's default dynamics model setting, causing temporary loss of lock.
3. Power Sag / Brownout: Voltage dropping below 2.7V causes internal controller reset, producing corrupt or missing NMEA sentences.

## Technical Troubleshooting Procedures
- Step 1: Verify power rail voltage (3.3V).
- Step 2: Inspect active ceramic patch antenna and SMA connection for mechanical stress.
- Step 3: Check UART RX/TX connection and baud rate.
- Step 4: Fall back to barometric altitude sensor for flight telemetry.
