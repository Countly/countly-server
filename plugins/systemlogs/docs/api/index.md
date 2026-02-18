---
sidebar_position: 1
sidebar_label: "Overview"
---

# System Logs

System Logs capture administrative actions and system-level events across Countly. This feature provides endpoints to query logs, fetch metadata for filters, and record custom log entries.

---

## Key Capabilities

- Centralized auditing of admin actions and system changes.
- DataTables-compatible query responses for UI tables.
- Export mode that flattens log payloads for reporting.
- Metadata endpoint for UI filters and user lists.

---


## Database Collections

| Collection | Purpose |
|---|---|
| `systemlogs` | Application and error logs with timestamps and severity |


## Configuration & Settings

Logging configuration:
- **Retention**: Days to keep logs (default: 30)
- **Max Size**: Maximum log file size before rotation

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/o?method=systemlogs` | Query system log entries |
| GET/POST | `/o?method=systemlogs_meta` | Fetch metadata and user list |
| GET/POST | `/i/systemlogs` | Record a system log entry |

---

## Authentication
- **Read endpoints** require **global admin** API key.
- **Write endpoint** (`/i/systemlogs`) requires authenticated user context.

---

## Data Model

### Log Entry

| Field | Type | Description |
|-------|------|-------------|
| `a` | String | Action name (e.g., `app_updated`, `user_deleted`) |
| `i` | Object | Action payload details |
| `ts` | Number | Unix timestamp (seconds) |
| `cd` | Date/String | Creation date |
| `u` | String | User email/username |
| `ip` | String/Null | Client IP (null when redacted) |
| `app_id` | String | Related app ID |
| `user_id` | String | Related user ID |

---

## Usage Notes

- **Search**: `sSearch` performs regex matching against the action field.
- **Time filter**: `period` parameter maps to a `ts` range query.
- **Export mode**: `export` flattens payload into `subject_id`, `name`, `before`, `after`, or `value`.
- **Privacy**: IP can be redacted via feature configuration (`preventIPTracking`).

---

## Documentation

- [Query System Logs](./o-systemlogs-query.md)
- [System Logs Meta](./o-systemlogs-meta.md)
- [Record System Log](./i-systemlogs.md)

---

## Related Docs


---

## Enterprise

Plugin: systemlogs

## Last Updated

February 2026
