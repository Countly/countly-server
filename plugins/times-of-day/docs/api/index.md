---
sidebar_position: 1
sidebar_label: "Overview"
---

# Times Of Day

## Overview

Times Of Day provides a 7x24 activity heatmap by weekday and hour for sessions and events.

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.times_of_day` | Stores monthly day/hour count documents for sessions and events. |
| `countly.events` | Provides event allow-list used during ingestion when event limit applies. |

## Endpoints

- [Times Of Day - Query](o-times-of-day.md) - `/o?method=times-of-day`
- [Times Of Day - Ingestion](i-times-of-day.md) - `/i`

## Last Updated

2026-03-05
