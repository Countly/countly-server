---
sidebar_label: "Apps Compare"
---

# Compare - Apps

## Endpoint

```text
/o/compare/apps
```

## Overview

Compares core session/user metrics across multiple apps and returns one summary object per app.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `compare` `Read` permission.

Additional access rule: non-global-admin users must have rights to every app in `apps`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `apps` | JSON String (Array) | Yes | JSON-stringified array of app IDs. Max `20`; each ID must be 24 chars. |
| `period` | String | No | Standard Countly period parameter. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

### `apps` Array Structure

Example decoded value:

```json
[
  "6991c75b024cb89cdc04efd2",
  "65dc6a52a2f7156eb2576f10"
]
```

## Response

### Success Response

```json
[
  {
    "id": "6991c75b024cb89cdc04efd2",
    "name": "Production App",
    "sessions": { "total": 1240, "change": "12.4%", "trend": "u" },
    "users": { "total": 980, "change": "9.1%", "trend": "u", "is_estimate": false },
    "newusers": { "total": 210, "change": "5.7%", "trend": "u" },
    "duration": { "total": "18.4 hours", "change": "7.2%", "trend": "u" },
    "avgduration": { "total": "1.2 min", "change": "1.0%", "trend": "u" },
    "charts": {
      "total-users": [[0, 45], [1, 52]],
      "new-users": [[0, 8], [1, 9]],
      "total-sessions": [[0, 51], [1, 59]],
      "time-spent": [[0, "1.1"], [1, "1.3"]],
      "total-time-spent": [[0, "55.0"], [1, "76.7"]],
      "avg-events-served": [[0, "4.2"], [1, "4.4"]]
    }
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Root array of app comparison objects. |
| `[].id` | String | App ID. |
| `[].name` | String | App name. |
| `[].sessions` | Object | Session totals/changes. |
| `[].users` | Object | User totals/changes. |
| `[].newusers` | Object | New user totals/changes. |
| `[].duration` | Object | Total duration metrics. |
| `[].avgduration` | Object | Average duration metrics. |
| `[].charts` | Object | Chart series arrays for compared metrics. |

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
  "result": "Missing parameter: apps"
}
```

- `400`

```json
{
  "result": "Maximum length for parameter apps is 20"
}
```

- `400`

```json
{
  "result": "Invalid app id length in apps parameter, each app id should be 24 characters long"
}
```

- `401`

```json
{
  "result": "User does not exist"
}
```

- `401`

```json
{
  "result": "App does not exist"
}
```

- `401`

```json
{
  "result": "User does not have view rights for one or more apps provided in apps parameter"
}
```

- `503`

```json
{
  "result": "Fetch apps data failed"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Compare apps | Valid app list and user access | Loads app names, then computes session/user summaries and chart series per app. | Raw array of app summary objects |
| Access denied | Non-admin user lacks access to one or more apps | Stops before metric fetch. | Wrapped error message |

### Impact on Other Data

- Read-only endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account, role, lock state, and app access rights. |
| `countly.apps` | App validation and metadata lookup | Validates app existence and reads app names/timezone for requested app IDs. |
| `countly.users` | Metric comparison source | Reads per-app user/session time-series and totals used in comparison output. |

---

## Examples

### Compare two apps

```text
/o/compare/apps?
  api_key=YOUR_API_KEY&
  period=30days&
  apps=["6991c75b024cb89cdc04efd2","65dc6a52a2f7156eb2576f10"]
```

## Operational Considerations

- Response time grows with the number of compared apps (up to 20), because metrics are fetched per app and then merged.
- Use shorter periods for faster responses when comparing many apps.

## Limitations

- Maximum of 20 apps per request.
- Each app ID in `apps` must be a 24-character ObjectId string.
- Non-admin users must have access rights to every requested app.

## Related Endpoints

- [Compare - Events](o-compare-events.md)

## Last Updated

2026-02-17
