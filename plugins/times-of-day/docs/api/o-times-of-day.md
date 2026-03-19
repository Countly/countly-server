---
sidebar_label: "Times Of Day Query"
---

# Times Of Day - Query

## Endpoint

```plaintext
/o?method=times-of-day
```

## Overview

Returns a 7x24 matrix (day-of-week x hour) for session or event activity.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `times_of_day` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `times-of-day`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | App id. |
| `tod_type` | String | Yes | Event key or `[CLY]_session`. |
| `date_range` | String | No | Comma-separated month ids like `2025:01,2025:02`. |
| `fetchFromGranural` | Boolean/String | No | When truthy, runs granular long-task path instead of stored docs. |
| `period` | String | No | Used with `fetchFromGranural` path. |
| `periodOffset` | Number | No | Used with `fetchFromGranural` path. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.request_threshold` | Server config | Long-task threshold | Granular mode runs with half of this value as timeout threshold. |

## Response

### Success Response

```json
[
  [5, 1, 0, 0, 2, 3, 8, 12, 19, 25, 13, 8, 7, 10, 11, 9, 6, 4, 2, 1, 0, 0, 1, 3],
  [2, 0, 0, 1, 1, 2, 5, 9, 14, 18, 22, 16, 10, 7, 6, 8, 5, 3, 1, 1, 0, 0, 0, 2],
  [1, 0, 0, 0, 0, 1, 3, 5, 8, 12, 15, 12, 9, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 1],
  [0, 0, 0, 0, 0, 1, 2, 4, 7, 9, 11, 10, 8, 5, 4, 4, 3, 2, 1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 1, 2, 4, 7, 12, 14, 13, 11, 10, 8, 7, 6, 4, 3, 2, 1, 0, 0, 0, 1],
  [2, 0, 0, 1, 1, 3, 6, 9, 13, 16, 18, 14, 9, 6, 5, 5, 4, 3, 2, 1, 0, 0, 0, 2],
  [4, 1, 0, 0, 1, 2, 6, 11, 17, 21, 19, 13, 9, 7, 6, 5, 4, 3, 2, 1, 0, 0, 1, 4]
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Array | Array with 7 rows (Sunday..Saturday), each row contains 24 hourly counts. |

### Error Responses

- `400`

```json
{
  "result": "Something went wrong"
}
```

## Behavior/Processing

- Standard mode: reads monthly docs from `times_of_day` and aggregates to 7x24 matrix.
- Granular mode (`fetchFromGranural`): uses calculated-data long task and maps day `7` to `0` (Sunday).

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.times_of_day` | Times of day source | Reads monthly activity docs for selected `tod_type` and app. |

---

## Examples

### Query session heatmap

```plaintext
/o?method=times-of-day&api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&tod_type=[CLY]_session
```

### Query event heatmap for selected months

```plaintext
/o?method=times-of-day&api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&tod_type=purchase&date_range=2025:01,2025:02
```

## Related Endpoints

- [Times Of Day - Ingestion](i-times-of-day.md)

## Last Updated

2026-03-05
