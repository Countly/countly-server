---
sidebar_label: "Main Data Ingestion"
---

# /i

## Endpoint

```plaintext
/i
```

## Overview

Primary SDK ingestion endpoint for sessions, events, metrics, and user updates.

## Authentication

- Uses SDK app authentication (`app_key`).
- Dashboard `api_key` / `auth_token` is not used for this endpoint.

## Permissions

- Access is controlled by valid app write access (`app_key`).

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `app_key` | String | Yes | App key for ingestion authorization. |
| `device_id` | String | Yes | Stable device identifier. |
| `timestamp` | Number | No | Event/request timestamp. |
| `begin_session` | Number or Boolean | No | Starts a session for this request. |
| `end_session` | Number or Boolean | No | Ends current session for this request. |
| `session_duration` | Number | No | Session duration (seconds). |
| `events` | Array or JSON String (Array) | No | Event list for this request. |
| `metrics` | Object or JSON String (Object) | No | Device/session metrics payload. |
| `user_details` | Object or JSON String (Object) | No | User profile update payload. |
| `crash` | Object or JSON String (Object) | No | Crash payload when crash reporting is sent. |
| `consent` | Object or JSON String (Object) | No | Consent payload when consent updates are sent. |
| `ip_address` | String | No | IP override for geo resolution. |
| `country_code` | String | No | Country override for geo resolution. |
| `city` | String | No | City override for geo resolution. |

### `events` Array Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | String | Yes | Event key. |
| `count` | Number | No | Event count increment (default `1` if omitted by sender logic). |
| `sum` | Number | No | Optional sum value. |
| `dur` | Number | No | Optional duration value. |
| `segmentation` | Object | No | Optional segmentation map. |

Example event item:

```json
{
  "key": "Purchase",
  "count": 1,
  "sum": 19.99,
  "segmentation": {
    "plan": "pro",
    "currency": "USD"
  }
}
```

## Parameter Semantics

- `events` string parsing failures do not fail the request; events are treated as empty.
- `device_id` and `app_key` are required to process ingestion.
- Request payload may include multiple ingestion actions in one call (for example `begin_session` + `events`).

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.trim_trailing_ending_spaces` | `false` | Request normalization | When enabled, trims leading/trailing spaces from incoming values. |
| `api.prevent_duplicate_requests` | `false` | Duplicate suppression | Duplicate payloads can be ignored when enabled. |

## Response

### Success Response

Standard success:

```json
{
  "result": "Success"
}
```

Ignored request success (for example duplicate/validation-cancelled request path):

```json
{
  "result": "Success",
  "info": "Request ignored: Duplicate request"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | `"Success"` when request is accepted or intentionally ignored. |
| `info` | String | Present only in ignored/redirected success paths; explains why request was skipped. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"app_key\" or \"device_id\""
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "App does not exist"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "App is currently not accepting data"
}
```

**Status Code**: `403 Forbidden`
```json
{
  "result": "App is locked"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Valid ingestion mode | Required identifiers and app validation pass | Processes session/events/metrics/user payload through standard ingestion flow. | Wrapped success string (optionally with `info`) |
| Ignored/redirected mode | Request is intentionally skipped by ingestion guards | Returns success plus informational `info` reason. | Wrapped object `{ "result": "Success", "info": "..." }` |
| Validation failure mode | Missing required identifiers or app restrictions | Fails early with validation/authorization error. | Wrapped string error |

### Impact on Other Data

- Updates ingestion-backed aggregates and user state depending on payload content.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint itself.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.apps` | App-key validation and app-state checks | Reads app configuration and lock/acceptance flags during ingestion validation. |
| `countly.app_users{appId}` | User profile/session state | Creates/updates app user state and profile fields. |
| `countly.users{appId}` | Session/user aggregates | Updates aggregate counters and time-based usage metrics. |
| `countly.device_details{appId}` | Device/platform aggregates | Updates OS/version/device/resolution metrics. |
| `countly.events_data` | Event aggregates | Updates event counts/sums/durations and segment aggregates. |
| `countly.metric_changes{appId}` | Metric change tracking | Tracks historical metric transitions used by corrections. |
| `countly_drill.drill_events` | Drill/raw event pipeline | Writes or forwards detailed event-level records. |

---

## Examples

### Example 1: Begin session with metrics

```plaintext
/i?
  app_key=YOUR_APP_KEY&
  device_id=device-123&
  begin_session=1&
  metrics={"_os":"iOS","_device":"iPhone","_app_version":"2.1.0"}
```

### Example 2: Send events

```plaintext
/i?
  app_key=YOUR_APP_KEY&
  device_id=device-123&
  events=[{"key":"Purchase","count":1,"sum":19.99,"segmentation":{"plan":"pro"}}]
```

### Example 3: End session

```plaintext
/i?
  app_key=YOUR_APP_KEY&
  device_id=device-123&
  end_session=1&
  session_duration=245
```

## Operational Considerations

- Keep payloads minimal and valid to reduce ingestion overhead.
- High-frequency clients should use `/i/bulk` where batching is appropriate.

## Limitations

- Per-request payload validation can skip/ignore data paths that fail validation checks.
- Success response does not include per-field ingestion processing details.

---

## Related Endpoints

- [Data Ingestion - Bulk Ingestion](./i-bulk.md)

## Last Updated

2026-02-17
