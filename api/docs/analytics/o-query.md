---
sidebar_label: "Run Query"
---

# /o

## Endpoint

```plaintext
/o
```

## Overview

Method-based analytics endpoint. The `method` parameter selects which analytics handler is executed.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Most methods require core read access for the provided app.
- `method=all_apps` requires global admin access.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | App ID (24-char hex). |
| `method` | String | Yes | Handler selector. |
| `period` | String | No | Period used by time-based methods. |
| `metric` | String | No | Metric key used by methods like `total_users`. |
| `event` | String | No | Single event key for `method=events`. |
| `events` | JSON String (Array) or Array | No | Event list for `method=events`. |
| `overview` | Boolean | No | If truthy with `method=events&events=...`, returns overview-style event output. |
| `_id` | String | No | Event-group ID for `method=get_event_group`. |
| `loadFor` | String | No | Used by `method=geodata` (for example `cities`). |
| `query` | String | No | Query payload used by `method=geodata`. |

## Parameter Semantics

Supported core methods include:

- `total_users`
- `get_period_obj`
- `locations`, `sessions`, `users`
- `app_versions`, `device_details`
- `devices`, `carriers`
- `countries`, `cities`
- `geodata`
- `get_event_groups`, `get_event_group`
- `events`, `get_events`
- `top_events`
- `all_apps`
- `notes`

If method is not handled by core or a plugin extension, the endpoint returns `Invalid method`.

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.country_data` | `true` | `method=countries` | When `false`, response is `{}` instead of country data. |
| `api.city_data` | `true` | `method=cities` | When `false`, response is `{}` instead of city data. |
| `api.event_limit` | Configured | `method=get_events` | Limits number of events returned in merged event list output. |
| `api.event_segmentation_limit` | Configured | `method=get_events` | Returned in `limits` metadata. |
| `api.event_segmentation_value_limit` | Configured | `method=get_events` | Returned in `limits` metadata. |

## Response

### Success Response

`method=total_users`:

```json
[
  {"_id": "users", "u": 56, "pu": 57}
]
```

`method=get_period_obj&period=7days`:

```json
{
  "start": 1770674400000,
  "end": 1771279199999,
  "daysInPeriod": 7,
  "periodContainsToday": true,
  "currentPeriodArr": ["2026.2.10", "2026.2.11", "2026.2.12"]
}
```

`method=events&events=["Playback Started","Playback Resumed"]&overview=true`:

```json
{
  "Playback Started": {
    "data": {
      "count": {"total": 152, "change": "NA", "trend": "u", "sparkline": [0, 0, 0]},
      "sum": {"total": 0, "change": "NA", "trend": "u", "sparkline": [0, 0, 0]},
      "dur": {"total": 0, "change": "NA", "trend": "u", "sparkline": [0, 0, 0]}
    }
  },
  "Playback Resumed": {
    "data": {
      "count": {"total": 155, "change": "NA", "trend": "u", "sparkline": [0, 0, 0]},
      "sum": {"total": 0, "change": "NA", "trend": "u", "sparkline": [0, 0, 0]},
      "dur": {"total": 0, "change": "NA", "trend": "u", "sparkline": [0, 0, 0]}
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Used in wrapped helper responses (for errors and some branches). |
| `[]` | Array | Used by many method outputs (`total_users`, metric arrays, event arrays). |
| `event_key` | Object | Used in events-overview mode; response object uses requested event names as keys. |
| `start` | Number | Period start timestamp (`get_period_obj`). |
| `end` | Number | Period end timestamp (`get_period_obj`). |
| `daysInPeriod` | Number | Period length (`get_period_obj`). |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{"result":"Missing parameter \"app_id\""}
```

**Status Code**: `400 Bad Request`
```json
{"result":"Invalid method"}
```

**Status Code**: `401 Unauthorized`
```json
{"result":"User does not have right"}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Method dispatch mode | `method` is set to supported core handler (`total_users`, `sessions`, `countries`, `get_events`, etc.) | Routes request to method-specific read handler after permission checks. | Raw root payload shape depends on selected method. |
| Events overview mode | `method=events` with `events` array and truthy `overview` | Aggregates count/sum/duration overview for each requested event/event group. | Raw root object keyed by event names. |
| Events merged mode | `method=events` with `events` array and no `overview` | Merges requested events into standard event output. | Raw root object keyed by event names. |
| Events prefetch mode | `method=events` with single `event` or no event filters | Runs single-event prefetch (or grouped-event flow) and returns subperiod/summary output. | Raw root array/object depending on branch parameters. |

### Impact on Other Data

- Read-only endpoint for core methods documented here.

## Audit & System Logs

- No `/systemlogs` action is emitted by these read methods.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` for method authorization. |
| `countly.apps` | App context validation and app listing | Reads app record for app-scoped methods; `method=all_apps` reads app list output. |
| `countly.users{appId}` | Session/user aggregate methods | Read in user/session/location methods. |
| `countly.device_details{appId}` | Device/platform methods | Read in app version and device-detail methods. |
| `countly.devices{appId}` | Device/manufacturer methods | Read in devices/manufacturers branches. |
| `countly.carriers{appId}` | Carrier metrics | Read in carriers methods. |
| `countly.events` | Event list metadata (`get_events`) | Read for event list, segments, and limits output. |
| `countly.events_data` | Event aggregate methods | Read in event analytics branches. |
| `countly.event_groups` | Event group methods | Read in `get_event_groups` and `get_event_group`. |
| `countly.top_events` | Top events method | Read in `top_events`. |
| `countly_drill.drill_meta` | Event metadata enrichment (`get_events`) | Read to merge drill event names and segment definitions. |

---

## Examples

### Example 1: Get period object

```plaintext
/o?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  method=get_period_obj&
  period=7days
```

### Example 2: Get total users

```plaintext
/o?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  method=total_users&
  metric=users&
  period=30days
```

### Example 3: Get events overview for selected events

```plaintext
/o?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  method=events&
  events=["Playback Started","Playback Resumed"]&
  overview=true&
  period=30days
```

## Operational Considerations

- Method behavior and response shape vary significantly; always set explicit `method` and method-specific parameters.
- Heavy event methods (`events`, `get_events`, `top_events`) can return large payloads on high-cardinality datasets.

## Limitations

- Unknown methods return `Invalid method`.
- Some method outputs depend on feature/config toggles (`country_data`, `city_data`).

---

## Related Endpoints

- [Analytics - Read Dashboard](./o-analytics-dashboard.md)
- [Analytics - Read Events](./o-analytics-events.md)
- [Analytics - Read Metric](./o-analytics-metric.md)

## Last Updated

2026-02-17
