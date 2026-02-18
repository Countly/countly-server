---
sidebar_position: 1
sidebar_label: "Overview"
---

# Analytics - API Documentation

## Overview

Analytics endpoints return aggregated usage, geography, event, and behavior metrics for one app.

## Quick Links

- [Analytics - Run Query](./o-query.md) - `/o` with `method=...`
- [Analytics - Read Dashboard](./o-analytics-dashboard.md) - `/o/analytics/dashboard`
- [Analytics - Read Countries](./o-analytics-countries.md) - `/o/analytics/countries`
- [Analytics - Read Sessions](./o-analytics-sessions.md) - `/o/analytics/sessions`
- [Analytics - Read Metric](./o-analytics-metric.md) - `/o/analytics/metric`
- [Analytics - Read Tops](./o-analytics-tops.md) - `/o/analytics/tops`
- [Analytics - Read Loyalty](./o-analytics-loyalty.md) - `/o/analytics/loyalty`
- [Analytics - Read Frequency](./o-analytics-frequency.md) - `/o/analytics/frequency`
- [Analytics - Read Durations](./o-analytics-durations.md) - `/o/analytics/durations`
- [Analytics - Read Events](./o-analytics-events.md) - `/o/analytics/events`

## Data Sources

| Collection | Purpose |
|---|---|
| `countly.users{appId}` | Core aggregated session/user metrics used by dashboard, sessions, countries, loyalty, frequency, and durations. |
| `countly.device_details{appId}` | Aggregated platform/device/version/resolution metrics used by dashboard and tops/metric queries. |
| `countly.carriers{appId}` | Aggregated carrier metrics used by dashboard and tops/metric queries. |
| `countly.events_data` | Aggregated custom-event metrics used by events endpoints. |
| `countly.event_groups` | Event-group definitions used in grouped event queries. |
| `countly.app_users{appId}` | Base user universe for total-user correction logic. |
| `countly.metric_changes{appId}` | Historical metric-change correction source for total-user estimation. |

## Configuration Impact

| Setting | Affects | Impact |
|---|---|---|
| `api.total_users` | Dashboard/countries/metric/tops user-estimation paths | When disabled, total-user correction is skipped. |
| `api.metric_changes` | Metric-change correction in total-user estimation | When disabled, previous metric values are not merged from change history. |
| `api.country_data` | `method=countries` on `/o` | When disabled, countries response becomes empty object for method-based route. |
| `api.city_data` | `method=cities` on `/o` | When disabled, cities response becomes empty object for method-based route. |

## Key Behavior Notes

- `/o/analytics/*` endpoints return raw JSON payloads (not wrapped under `result`).
- Most endpoints have multiple output modes based on request parameters (`metric`, `metrics`, `event`, `events`, `segmentation`, `bucket`).
- Event analytics can return subperiod, segmented, or grouped outputs depending on parameters.

## Limitations

- Metrics are aggregation-based and can be empty for low-traffic apps or unsupported metric keys.
- Large periods and high-cardinality segmentation increase processing cost.

## Last Updated

2026-02-17
