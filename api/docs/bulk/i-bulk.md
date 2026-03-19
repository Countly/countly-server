---
sidebar_label: "Bulk Ingestion"
---

# /i/bulk

## Endpoint

```plaintext
/i/bulk
```

## Overview

Processes multiple ingestion payloads in one request. Each valid item is handled through the same ingestion flow as `/i`.

## Authentication

- Uses SDK authentication (`app_key`), not dashboard `api_key` authentication.
- `app_key` can be provided:
  - once at top level (`app_key=...`) to be reused by request items
  - or per request item (`requests[n].app_key`)

## Permissions

- No dashboard role permission is required.
- Access is controlled by valid app write access (`app_key`) for each processed item.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `app_key` | String | Conditionally | Optional top-level app key fallback for request items that do not include `requests[n].app_key`. |
| `requests` | Array or JSON String (Array) | Yes | Batch of ingestion payloads. Must be an array; each item is a single `/i`-style payload. |
| `requests[n].device_id` | String | Yes | Device ID for that request item. Items missing `device_id` are skipped. |
| `requests[n].app_key` | String | Conditionally | Required when no top-level `app_key` is provided. |
| `requests[n].events` | Array or JSON String (Array) | No | Event list for that request item. |
| `requests[n].metrics` | Object or JSON String (Object) | No | Metrics payload for that request item. |
| `requests[n].begin_session` | Number or Boolean | No | Starts a session for that request item. |
| `requests[n].end_session` | Number or Boolean | No | Ends a session for that request item. |
| `requests[n].session_duration` | Number | No | Session duration for that request item. |
| `requests[n].timestamp` | Number | No | Request timestamp. |
| `requests[n].ip_address` | String | No | Optional IP override for geo resolution. |
| `requests[n].country_code` | String | No | Optional country override for geo resolution. |
| `requests[n].city` | String | No | Optional city override for geo resolution. |

## Parameter Semantics

- `requests` can be sent as a JSON string or an array.
- Invalid request items (missing `device_id`, missing usable `app_key`, or falsy item) are skipped silently.
- Valid items are processed sequentially.

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.prevent_duplicate_requests` | `false` | Duplicate detection | When enabled, duplicate payloads can be ignored during ingestion processing. |

## Response

### Success Response

```json
{
  "result": "Success"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | `"Success"` when the bulk request is accepted and processed. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"requests\""
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid parameter \"requests\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Validation error mode | `requests` is missing or not an array | Returns immediate input-validation error. | Wrapped string error |
| Bulk processing mode | `requests` is a valid array | Iterates items sequentially, applies top-level `app_key` fallback, processes each valid item through `/i` ingestion flow. | Wrapped string `{ "result": "Success" }` |
| Item-skip mode | A request item is invalid (`missing app_key/device_id` or falsy item) | Skips invalid item without failing whole batch. | Final response remains `{ "result": "Success" }` |

### Impact on Other Data

- This endpoint itself is a dispatcher. Data impact depends on each request item payload.
- Processed items can update user/session/event analytics data through the standard ingestion pipeline.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint itself.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.apps` | App-key validation source | Reads app configuration for each processed request item during ingestion validation. |
| `countly.app_users{appId}` | App user profile/session updates from processed ingestion items | Read and update user profile/session state. |
| `countly.users{appId}` | Aggregated session metrics | Updated when session/event data is processed. |
| `countly.device_details{appId}` | Aggregated device metrics | Updated from item metrics payloads. |
| `countly.events_data` | Aggregated event metrics | Updated for custom and internal event processing. |
| `countly_drill.drill_events` | Drill/raw event storage pipeline | Written/queued depending on event processing path. |

---

## Examples

### Example 1: One app key for all items

```plaintext
/i/bulk?app_key=YOUR_APP_KEY&requests=[
  {
    "device_id": "d-1001",
    "begin_session": 1,
    "metrics": {"_os": "iOS", "_device": "iPhone"}
  },
  {
    "device_id": "d-1001",
    "events": [{"key": "Purchase", "count": 1, "sum": 19.99}]
  }
]
```

### Example 2: Per-item app keys

```plaintext
/i/bulk?requests=[
  {
    "app_key": "APP_KEY_A",
    "device_id": "user-a",
    "begin_session": 1
  },
  {
    "app_key": "APP_KEY_B",
    "device_id": "user-b",
    "events": [{"key": "Play", "count": 1}]
  }
]
```

## Operational Considerations

- Processing is sequential per request item.
- Large batches increase request time and ingestion load.
- Only one aggregate success response is returned, without per-item status details.

## Limitations

- Invalid items are skipped silently.
- No per-item result payload is returned.
- This endpoint does not provide rollback if some items are skipped or ignored.

---

## Related Endpoints

- [Data Ingestion - Main Data Ingestion](./ingestion.md)

## Last Updated

2026-02-17
