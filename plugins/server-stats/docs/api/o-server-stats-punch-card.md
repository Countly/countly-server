---
sidebar_label: "Punch Card Read"
---

# /o/server-stats/punch-card

## Endpoint

```plaintext
/o/server-stats/punch-card
```

## Overview

Returns punch-card style hourly distribution for datapoints, sessions, and events across the requested period.

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
  "data": [
    [
      8,
      0,
      145,
      {
        "min": 40,
        "max": 55,
        "sum": 145,
        "avg": 0,
        "cn": 3,
        "s": 52,
        "e": 81,
        "p": 12
      }
    ],
    [
      9,
      0,
      120,
      {
        "min": 30,
        "max": 50,
        "sum": 120,
        "avg": 0,
        "cn": 3,
        "s": 43,
        "e": 70,
        "p": 7
      }
    ]
  ],
  "dayCount": 7,
  "labels": [
    "2026.2.11",
    "2026.2.12"
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `data` | Array | Punch-card matrix rows represented as tuples. |
| `data[].0` | Number | Hour index (`0-23`). |
| `data[].1` | Number | Day-row index in the punch-card matrix. |
| `data[].2` | Number | Sum of datapoints for that hour/day slot. |
| `data[].3` | Object | Aggregated slot details. |
| `data[].3.min` | Number or null | Minimum slot value among merged contributors. |
| `data[].3.max` | Number | Maximum slot value among merged contributors. |
| `data[].3.sum` | Number | Total datapoints for slot. |
| `data[].3.cn` | Number | Distinct contributor count used in slot aggregation. |
| `data[].3.s` | Number | Session count for slot. |
| `data[].3.e` | Number | Event count for slot. |
| `data[].3.p` | Number | Push action count for slot. |
| `dayCount` | Number | Number of days in requested period. |
| `labels` | Array | Date labels used when period is 7 days or less. |

### Error Responses

`400 Bad Request`

```json
{
  "result": "Something went wrong"
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
| Global mode | Authenticated user is global admin | Aggregates selected/all-app documents for period and builds full punch-card matrix. | Raw object `{ data, dayCount, labels }` |
| Restricted mode | Authenticated non-global user | Restricts filter to user-app access list before punch-card aggregation. | Raw object `{ data, dayCount, labels }` |

### Impact on Other Data

- This endpoint is read-only and does not mutate persisted metrics.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication validation | Reads member account and lock status during `authenticated-user validation` authentication. |
| `countly.server_stats_data_points` | Stores monthly and hourly datapoint metrics per app | Reads period-matching documents and aggregates hourly buckets into punch-card output. |

---

## Examples

### Read default punch-card data

```plaintext
/o/server-stats/punch-card?api_key=YOUR_API_KEY
```

### Read punch-card for one app and month period

```plaintext
/o/server-stats/punch-card?api_key=YOUR_API_KEY&selected_app=YOUR_APP_ID&period=month
```

## Limitations

- Non-global users can only see data from accessible apps.
- `avg` field in slot payload is present but not computed in this implementation path.

## Related Endpoints

- [Server Stats - Data Points Read](o-server-stats-data-points.md)
- [Server Stats - Top Read](o-server-stats-top.md)

## Last Updated

2026-02-17
