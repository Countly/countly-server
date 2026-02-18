---
sidebar_label: "Top Read"
---

# /o/server-stats/top

## Endpoint

```plaintext
/o/server-stats/top
```

## Overview

Returns top 3 apps by current/previous hour datapoint volume for the current UTC month.

## Authentication

Countly API supports three authentication methods:

1. **API Key** (parameter): `api_key=YOUR_API_KEY`
2. **Auth Token** (parameter): `auth_token=YOUR_AUTH_TOKEN`
3. **Auth Token** (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Authenticated dashboard user credentials are required (`api_key` or `auth_token`).

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |

## Response

### Success Response

```json
[
  {
    "a": "6991c75b024cb89cdc04efd2",
    "v": 186
  },
  {
    "a": "6a11c75b024cb89cdc04ef01",
    "v": 122
  },
  {
    "a": "6b22c75b024cb89cdc04ef02",
    "v": 95
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Array | Raw list of top app datapoint entries. |
| `[].a` | String | App ID. |
| `[].v` | Number | Datapoint score computed from current and previous hour. |

### Error Responses

`400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

`401 Unauthorized`

```json
{
  "result": "User does not exist"
}
```

## Behavior/Processing

- Determines current UTC month/day/hour.
- Reads month documents from server-stats datapoints collection.
- For each app, sums `dp` for current hour and previous hour (if present).
- Excludes `[CLY]_consolidated` from returned list.
- Sorts descending by score and returns top 3 entries.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication validation | Reads member account and lock status during `validateUser` authentication. |
| `countly.server_stats_data_points` | Stores monthly and hourly datapoint metrics per app | Reads current-month documents and computes per-app top scores. |

---

## Examples

### Read top apps by current/previous hour datapoints

```plaintext
/o/server-stats/top?api_key=YOUR_API_KEY
```

## Limitations

- Uses current UTC month and hour only; does not accept `period`.
- Returns maximum 3 app entries.
- Consolidated technical app key (`[CLY]_consolidated`) is intentionally excluded.

## Related Endpoints

- [Server Stats - Data Points Read](o-server-stats-data-points.md)
- [Server Stats - Punch Card Read](o-server-stats-punch-card.md)

## Last Updated

2026-02-17
