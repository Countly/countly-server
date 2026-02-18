---
sidebar_label: "Events Compare"
---

# Compare - Events

## Endpoint

```text
/o/compare/events
```

## Overview

Compares multiple events within one app and returns event time-series payloads keyed by event name.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `compare` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `events` | JSON String (Array) | Yes | JSON-stringified event key list. Max `20` events. |
| `app_id` | String | Yes | App ID used for event collection resolution and permission validation. |
| `period` | String | No | Standard Countly period parameter. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

### `events` Array Structure

Example decoded value:

```json
[
  "Login",
  "Purchase",
  "[CLY]_group_Checkout"
]
```

## Response

### Success Response

```json
{
  "Login": {
    "2026": {
      "2": {
        "17": {
          "0": { "c": 5 },
          "1": { "c": 3 },
          "c": 52
        }
      }
    },
    "meta": {
      "segments": ["Method"],
      "Method": ["Password", "Face ID"]
    }
  },
  "Purchase": {
    "2026": {
      "2": {
        "17": {
          "0": { "c": 2 },
          "c": 14
        }
      }
    },
    "meta": {
      "segments": []
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root object)` | Object | Root map keyed by requested event names. |
| `event_key` | Object | Time-series event payload for that event. |
| `event_key.meta` | Object | Segment metadata for event payload. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

- `400`

```json
{
  "result": "Missing parameter: events"
}
```

- `400`

```json
{
  "result": "Maximum length for parameter events is 20"
}
```

- `401`

```json
{
  "result": "No app_id provided"
}
```

- `401`

```json
{
  "result": "User does not have right"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Standard events | Event key does not start with `[CLY]_group_` | Hashes key with app ID and fetches per-event time object from events data collections. | Raw object keyed by input event names |
| Event groups | Event key starts with `[CLY]_group_` | Fetches merged event group payload through grouped event fetch flow. | Raw object keyed by input event names |

### Impact on Other Data

- Read-only endpoint.

## Operational Considerations

- The endpoint performs one fetch path per requested event key, then combines results into a single object.
- Grouped events (`[CLY]_group_...`) add merge work on top of event reads and can increase response time for large groups.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account, role, lock state, and feature access rights. |
| `countly.apps` | App validation | Validates `app_id` and loads app context (for timezone/period handling). |
| `countly.events_data` | Event series data source | Reads time-series event documents using app-and-event-hash `_id` prefixes. |
| `countly.event_groups` | Grouped-event mapping | Reads event group definitions and source-event membership for `[CLY]_group_...` keys. |

---

## Examples

### Compare two standard events

```text
/o/compare/events?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=7days&
  events=["Login","Purchase"]
```

### Compare grouped event and standard event

```text
/o/compare/events?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=30days&
  events=["[CLY]_group_Checkout","Purchase"]
```

## Limitations

- Maximum of 20 events per request.
- Event names are used as response keys exactly as provided.

## Related Endpoints

- [Compare - Apps](o-compare-apps.md)

## Last Updated

2026-02-17
