---
sidebar_label: "Slipping Read"
---

# /o/slipping

## Endpoint

```plaintext
/o/slipping
```

## Overview

Returns slipping-away user metrics for configured inactivity periods. Each row includes period length, user count, percentage, and threshold timestamp.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Required permission: `slipping_away_users` `Read`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | Target app ID. |
| `query` | JSON String (Object) or Object | No | Optional filter merged into user query before counting. |

Example `query`:

```json
{
  "country": "US",
  "custom.premium": true
}
```

## Parameter Semantics

- `query` can be sent as JSON string or object.
- If cohorts feature is enabled, cohort filters are preprocessed and merged into `query`.
- Invalid JSON in `query` is not rejected by this handler; request continues and can produce empty or unexpected counts.

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `slipping-away-users.p1` | `7` | Period thresholds | First output row uses this inactivity threshold (days). |
| `slipping-away-users.p2` | `14` | Period thresholds | Second output row uses this inactivity threshold (days). |
| `slipping-away-users.p3` | `30` | Period thresholds | Third output row uses this inactivity threshold (days). |
| `slipping-away-users.p4` | `60` | Period thresholds | Fourth output row uses this inactivity threshold (days). |
| `slipping-away-users.p5` | `90` | Period thresholds | Fifth output row uses this inactivity threshold (days). |

## Response

### Success Response

```json
[
  {
    "period": 7,
    "count": 245,
    "percentage": "12.50",
    "timeStamp": 1707609600
  },
  {
    "period": 14,
    "count": 412,
    "percentage": "21.00",
    "timeStamp": 1707004800
  },
  {
    "period": 30,
    "count": 680,
    "percentage": "34.69",
    "timeStamp": 1705622400
  },
  {
    "period": 60,
    "count": 890,
    "percentage": "45.38",
    "timeStamp": 1703030400
  },
  {
    "period": 90,
    "count": 1050,
    "percentage": "53.57",
    "timeStamp": 1700438400
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Slipping-away rows for configured inactivity periods. |
| `[].period` | Number | Inactivity threshold in days. |
| `[].count` | Number | User count matching `lac < threshold`. |
| `[].percentage` | String | Percentage of matching users vs total users (2 decimals). |
| `[].timeStamp` | Number | UTC Unix timestamp for threshold boundary. |

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
  "result": "User does not have right"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Base slipping metrics | `query` is omitted | Counts users in `app_users{appId}` for each configured inactivity threshold and total users. | Raw root array of period rows. |
| Filtered slipping metrics | `query` is provided | Merges `query` into each threshold condition before counting. | Raw root array of period rows. |
| Cohort-aware filtering | Cohorts feature is enabled and `query` includes cohort criteria | Preprocesses cohort query first, then runs filtered counting logic. | Raw root array of period rows. |

### Impact on Other Data

- Read-only endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify read access. |
| `countly.apps` | App context validation | Reads app record for the requested `app_id` during access validation. |
| `countly.app_users{appId}` | Inactivity analysis source | Counts users by `lac` threshold and optional query filters. |

## Examples

### Read slipping metrics for all users

```plaintext
/o/slipping?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2
```

### Read slipping metrics filtered by user properties

```plaintext
/o/slipping?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  query={"country":"US","custom.premium":true}
```

## Limitations

- Endpoint executes one count query per configured threshold plus one total-user count query.
- Very broad or unindexed `query` filters can increase response time.

## Related Endpoints

- [Slipping Away Users - Overview](index.md)

## Last Updated

2026-02-17
