---
sidebar_position: 1
sidebar_label: "Overview"
---

# Times Of Day

Times Of Day provides a 7x24 heatmap of activity by day of week and hour. It aggregates session and event counts at ingestion time and supports dashboard widgets and API queries.

---

## Key Capabilities

- Hourly activity heatmaps for sessions or events.
- Query API for analytics and exports.
- Dashboard widget integration.
- Permission-based access control (`times_of_day`).

---


## Database Collections

| Collection | Purpose |
|---|---|
| `app_users{appId}` | User profiles with session time-of-day distribution |


## Configuration & Settings

Time-of-day analytics uses core tracking. No additional configuration.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/o?method=times-of-day` | Query times-of-day grid (see [o-times-of-day.md](./o-times-of-day.md)) |
| POST | `/i` | Ingestion updates for sessions/events (see [i-times-of-day.md](./i-times-of-day.md)) |

---

## Data Model

Times Of Day returns a 7x24 matrix:

- **Rows**: Days of week (0=Sunday ... 6=Saturday)
- **Columns**: Hour of day (0-23)
- **Values**: Aggregated counts

Example cell reference: `data[2][13]` = Tuesday at 13:00.

---

## Authentication
- **Read endpoints** require read permission for `times_of_day`.
- **Ingestion** follows standard app write permissions on `/i`.

---

## Documentation

- [Query Times Of Day](./o-times-of-day.md)
- [Times Of Day Ingestion](./i-times-of-day.md)

---

## Related Docs


---

## Enterprise

Plugin: times-of-day

## Last Updated

February 2026
