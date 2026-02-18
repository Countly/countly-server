---
sidebar_label: "Data Points Read"
---

# /o/server-stats/data-points

## Endpoint

```plaintext
/o/server-stats/data-points
```

## Overview

Returns aggregated server data-point metrics (sessions/events and derived totals) for accessible apps over the requested period.

## Authentication

Countly API supports three authentication methods:

1. **API Key** (parameter): `api_key=YOUR_API_KEY`
2. **Auth Token** (parameter): `auth_token=YOUR_AUTH_TOKEN`
3. **Auth Token** (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Authenticated dashboard user credentials are required (`api_key` or `auth_token`).
- Non-global users are restricted to apps from their user-app access list.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `period` | String | No | Period expression supported by Countly period parser (default: `30days`). |
| `selected_app` | String | No | Restrict output to one app ID. |

## Response

### Success Response

```json
{
  "all-apps": {
    "events": 1240,
    "sessions": 910,
    "push": 30,
    "dp": 2150,
    "change": 180,
    "crash": 6,
    "views": 420,
    "actions": 110,
    "nps": 14,
    "surveys": 5,
    "ratings": 9,
    "apm": 44,
    "custom": 1170,
    "cs": 2,
    "ps": 25,
    "llm": 7,
    "aclk": 3
  },
  "6991c75b024cb89cdc04efd2": {
    "events": 1240,
    "sessions": 910,
    "push": 30,
    "dp": 2150,
    "change": 180,
    "crash": 6,
    "views": 420,
    "actions": 110,
    "nps": 14,
    "surveys": 5,
    "ratings": 9,
    "apm": 44,
    "custom": 1170,
    "cs": 2,
    "ps": 25,
    "llm": 7,
    "aclk": 3
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Raw map of aggregated datapoint objects keyed by `all-apps` and/or app IDs. |
| `{key}.events` | Number | Total event count in requested range. |
| `{key}.sessions` | Number | Total session count in requested range. |
| `{key}.dp` | Number | Total datapoints (sessions + event datapoints). |
| `{key}.change` | Number | Current period datapoint difference vs previous period. |
| `{key}.push` | Number | Push action count. |
| `{key}.crash` | Number | Crash count. |
| `{key}.views` | Number | View count. |
| `{key}.actions` | Number | Action count. |
| `{key}.nps` | Number | NPS event count. |
| `{key}.surveys` | Number | Survey event count. |
| `{key}.ratings` | Number | Star-rating event count. |
| `{key}.apm` | Number | APM event count. |
| `{key}.custom` | Number | Custom-event count. |
| `{key}.cs` | Number | Consent-event count. |
| `{key}.ps` | Number | Push-sent count. |
| `{key}.llm` | Number | LLM-event count. |
| `{key}.aclk` | Number | Attribution-click event count. |

### Error Responses

`401 Unauthorized`

```json
{
  "result": "User does not have apps"
}
```

`400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Global mode | Authenticated user is global admin and `selected_app` not set | Aggregates matching period buckets across all apps. | Raw object keyed by `all-apps` and app IDs. |
| Global single-app mode | Global admin with `selected_app` | Aggregates only selected app and suppresses `all-apps` aggregate. | Raw object keyed by selected app ID. |
| Restricted mode | Authenticated non-global user | Aggregates only apps returned by user-app access list; optional `selected_app` is applied only if in that list. | Raw object keyed by accessible app IDs and `all-apps` aggregate when not single-app. |

### Impact on Other Data

- This endpoint is read-only and does not mutate persisted metrics.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication validation | Reads member account and lock status during `validateUser` authentication. |
| `countly.server_stats_data_points` | Stores monthly and hourly datapoint metrics per app | Reads period-matching metric documents and aggregates counters for output. |

---

## Examples

### Read datapoints for default period

```plaintext
/o/server-stats/data-points?api_key=YOUR_API_KEY
```

### Read datapoints for one app and custom period

```plaintext
/o/server-stats/data-points?api_key=YOUR_API_KEY&selected_app=YOUR_APP_ID&period=60days
```

## Limitations

- Metric output depends on pre-aggregated `server_stats_data_points` documents.
- Non-global users without app access receive `User does not have apps`.

## Related Endpoints

- [Server Stats - Punch Card Read](o-server-stats-punch-card.md)
- [Server Stats - Top Read](o-server-stats-top.md)

## Last Updated

2026-02-17
