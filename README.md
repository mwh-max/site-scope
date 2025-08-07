# SiteScope

SiteScope is a browser-based noise and vibration logger that uses your device's microphone and motion sensors. It was built as a simple monitoring tool for jobsites, warehouses, or anywhere you need real-time readings and a persistent event log.

## What it does

- Displays current noise levels in decibels (dB)
- Tracks vibration levels using your device's accelerometer
- Logs high readings with timestamps
- Allows filtering by event type (noise or vibration)
- Stores log data in localStorage so it persists across sessions
- Offers one-click CSV export for sharing or recordkeeping

## Why I built it

I wanted to create a small, functional tool that works entirely in the browser. This project helped me work with the Web Audio API, `DeviceMotionEvent`, and `localStorage`, while building a clean UI and handling edge cases (like mic permissions or lack of sensor support).

It’s also part of a larger goal to build tools for people in physical work environments, not just screen-based ones.

## Requirements

- Works best in Chrome or Android-based browsers with microphone and accelerometer access
- Motion tracking may not work on iOS without explicit permissions

## Future features

- Manual log entries
- Graph or meter-style visualizations
- Threshold adjustments
- Cloud sync or team logging

## Privacy

SiteScope doesn’t record or store any audio. It reads microphone levels in real time, entirely on your device.

## Status

Version 1.0 — everything works as intended. I’m keeping the scope small for now before adding more features.

---
