---
sidebar_label: "Times Of Day Ingestion"
---

# /i (Times Of Day Ingestion)

## Overview

Times Of Day data is captured during ingestion. The feature listens on `/i` requests and updates the `times_of_day` collection for sessions and events based on `hour` and `dow` values provided by the SDK or server pipeline.

---

## Endpoint


```plaintext
/i
```

## Authentication

- **Required**: Standard Countly write access
- **HTTP Method**: GET or POST
- **Permissions**: App-level write

---


## Permissions

- Permissions: App-level write

## Request Parameters

### Session Tracking

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `app_key` | String | Yes | App key |
| `begin_session` | Number | Yes | Session begin flag (`1`) |
| `timestamp` | Number | Yes | Unix timestamp (seconds) |
| `hour` | Number | Yes | Hour of day (0-23) |
| `dow` | Number | Yes | Day of week (0-6, Sunday=0) |

### Event Tracking

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `events` | String (JSON) | No | JSON array of events with `key`, `count`, optional `timestamp`, `hour`, `dow` |

**Events JSON format**:
```json
[
  {"key": "purchase", "count": 1, "timestamp": 1738944200, "hour": 13, "dow": 2}
]
```

---

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.batch_processing` | Configured value | Processing flow | Changing this value can enable/disable branches in endpoint processing and alter returned results. |
| `api.event_limit` | Configured value | Validation and limits | Changing this value modifies accepted input limits and may return validation errors for larger payloads. |
| `api.session_cooldown` | Configured value | Validation and limits | Changing this value alters timing/lock behavior visible in API results. |
| `app.plugins.consolidate` | Per-app plugin setting | Validation/processing | Changing this value can alter request validation, processing behavior, or response fields. |
## Response

### Success Response

**Status Code**: `200 OK`

**Body** (standard `/i` response):
```json
{"result": "Success"}
```

---


### Response Fields

| Field | Type | Description |
|---|---|---|
| `*` | Varies | Fields returned by this endpoint. See Success Response example. |


### Error Responses

```json
{
  "result": "Error"
}
```

## Examples

### Example 1: Session begin with hour and dow

**Request** (GET):
```bash
curl "https://your-server.com/i?app_key=YOUR_APP_KEY&begin_session=1&timestamp=1738944200&hour=13&dow=2"
```

### Example 2: Event ingestion with hour and dow

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i" \
  -d "app_key=YOUR_APP_KEY" \
  -d "timestamp=1738944200" \
  -d 'events=[{"key":"purchase","count":2,"hour":13,"dow":2}]'
```

### Example 3: Mixed session and events

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i" \
  -d "app_key=YOUR_APP_KEY" \
  -d "begin_session=1" \
  -d "timestamp=1738944200" \
  -d "hour=13" \
  -d "dow=2" \
  -d 'events=[{"key":"add_to_cart","count":1,"hour":13,"dow":2},{"key":"purchase","count":1,"hour":13,"dow":2}]'
```

---

## Behavior Notes

- **Session entry**: Stored under `[CLY]_session` for the current month key.
- **Event entry**: Each event updates the same month bucket.
- **Required fields**: `hour` and `dow` must be present for updates to occur.
- **Event limit**: Honors `api.event_limit` and the app event list.
- **Batching**: Uses write batcher when batch processing is enabled.

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.app_users{appId}` | Stores per-app user profiles, metrics, and custom properties. | Creates, updates, or deletes documents in this collection based on request parameters. |
| `countly.apps` | Stores app definitions and app-level configuration metadata. | Creates, updates, or deletes documents in this collection based on request parameters. |
## Related Endpoints

- [Query Times Of Day](./o-times-of-day.md) - Read aggregated grid

---

## Enterprise

Plugin: times-of-day
Endpoint: /i (times-of-day ingestion)

## Last Updated

February 2026
