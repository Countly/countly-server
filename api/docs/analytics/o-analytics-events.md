---
sidebar_label: "Read Events"
---

# /o/analytics/events

## Endpoint

```plaintext
/o/analytics/events
```

## Overview

Returns event analytics in different output modes based on `event`, `events`, and `segmentation` parameters.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires read access to feature `core` for the target app.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | App ID (24-char hex). |
| `period` | String | No | Requested period for event aggregation. |
| `event` | String | No | Single event key mode. |
| `events` | JSON String (Array) or Array | No | Multi-event mode. |
| `segmentation` | String | No | Segment key. If set (and not `no-segment`), segmented output is returned. |
| `bucket` | String | No | Bucket override for single-event subperiod mode (`daily` / `monthly`). |
| `timezone` | String | No | Optional timezone override. |
| `timestamp` | Number | No | Optional reference timestamp. |

## Parameter Semantics

- `event` has priority over `events` when both are provided.
- `events` can be a JSON string or array.
- Invalid `events` JSON returns a validation error.
- If neither `event` nor `events` is provided, endpoint returns top summary from `all` aggregate.

## Response

### Success Response

Single event mode (`event=Playback Resumed`):

```json
[
  {"_id": "2026-2-10", "c": 8, "s": 0, "dur": 0},
  {"_id": "2026-2-11", "c": 6, "s": 0, "dur": 0}
]
```

Multi-event mode (`events=["Playback Started","Playback Resumed"]`):

```json
{
  "Playback Started": [
    {"_id": "2026-2-10", "c": 4, "s": 0, "dur": 0}
  ],
  "Playback Resumed": [
    {"_id": "2026-2-10", "c": 8, "s": 0, "dur": 0}
  ]
}
```

No event filter mode:

```json
{
  "all": [
    {"key": "Playback Completed", "c": 29, "s": 0, "dur": 147454},
    {"key": "Playback Resumed", "c": 25, "s": 0, "dur": 0}
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Returned in single-event mode. |
| `[] ._id` | String | Time bucket key in subperiod outputs. |
| `[] .c` | Number | Event count. |
| `[] .s` | Number | Event sum. |
| `[] .dur` | Number | Event duration total. |
| `event_key` | Array | Returned in multi-event mode; response object uses requested event names as keys. |
| `all` | Array | Returned when neither `event` nor `events` is provided. |
| `all[] .key` | String | Event key in summary mode. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{"result":"Must provide valid array with event keys as events param."}
```

**Status Code**: `400 Bad Request`
```json
{"result":"Missing parameter \"app_id\""}
```

**Status Code**: `401 Unauthorized`
```json
{"result":"App does not exist"}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Single-event subperiod | `event` is provided and `segmentation` is missing or `no-segment` | Reads hashed event aggregate and returns subperiod data (optionally bucketed). | Raw root array of event points. |
| Single-event segmented | `event` is provided and `segmentation` is set to a segment key | Reads hashed event aggregate and extracts segmented totals. | Raw root array of segment rows. |
| Multi-event mode | `event` is missing and `events` is a valid array/JSON string array | Iterates events, reads each aggregate, and returns data per event key. | Raw root object keyed by event name. |
| Summary mode | `event` and `events` are both missing | Reads `all` aggregate and returns key-based summary under `all`. | Raw root object: `{ "all": [...] }`. |

### Impact on Other Data

- Read-only endpoint.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify read access. |
| `countly.apps` | App context validation | Reads app record (`timezone`, app state) for the requested `app_id`. |
| `countly.events_data` | Event aggregate source | Read for event subperiod and segmented analytics. |

---

## Examples

### Example 1: Single event

```plaintext
/o/analytics/events?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  event=Playback Resumed&
  period=7days
```

### Example 2: Multiple events

```plaintext
/o/analytics/events?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  events=["Playback Started","Playback Resumed"]&
  period=7days
```

### Example 3: Segmented single event

```plaintext
/o/analytics/events?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  event=Purchase&
  segmentation=platform&
  period=30days
```

## Operational Considerations

- Multi-event mode runs event reads per requested event key.
- High-cardinality segmentation increases response size.

## Limitations

- Invalid `events` JSON fails request.
- Missing/unknown event keys can yield empty arrays.

---

## Related Endpoints

- [Analytics - Read Tops](./o-analytics-tops.md)
- [Analytics - Run Query](./o-query.md)

## Last Updated

2026-02-17
