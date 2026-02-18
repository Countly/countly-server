---
sidebar_label: "Query Times Of Day"
---

# /o?method=times-of-day

## Overview

Retrieve times-of-day analytics for sessions or a specific event. Returns a 7x24 matrix (days x hours) with aggregated counts.

---

## Endpoint


```plaintext
/o?method=times-of-day
```

## Authentication

- **Required**: Read access to Times Of Day feature
- **HTTP Method**: GET or POST
- **Permissions**: `times_of_day` read

---


## Permissions

- Permissions: times_of_day read

## Request Parameters

### Core Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `app_id` | String | Yes | App ID |
| `method` | String | Yes | Must be `times-of-day` |

### Times Of Day Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tod_type` | String | Yes | Event key or `[CLY]_session` |
| `date_range` | String | No | Comma-separated month keys (e.g., `2024:12,2025:01`) |
| `fetchFromGranural` | Boolean | No | Use long task aggregation instead of stored docs |
| `period` | String | No | Period for long task mode (e.g., `30days`, `custom`) |
| `periodOffset` | Number | No | Period offset for long task mode |

---

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

### Success Response

**Status Code**: `200 OK`

**Body**: 7x24 matrix of counts, Sunday as index `0`.

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

---


### Response Fields

| Field | Type | Description |
|---|---|---|
| `*` | Varies | Fields returned by this endpoint. See Success Response example. |


### Error Responses

```json
{
  "result": "Error"
}
```

## Examples

### Example 1: Sessions by time of day

**Request** (GET):
```bash
curl "https://your-server.com/o?method=times-of-day&api_key=YOUR_API_KEY&app_id=YOUR_APP_ID&tod_type=%5BCLY%5D_session"
```

### Example 2: Custom event by time of day

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o" \
  -d "method=times-of-day" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d "tod_type=purchase"
```

### Example 3: Limited month range

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o" \
  -d "method=times-of-day" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d "tod_type=%5BCLY%5D_session" \
  -d "date_range=2025:01,2025:02"
```

---

## Behavior Notes

- **Aggregation grid**: Always returns a 7x24 matrix.
- **Day index**: `0` is Sunday, `6` is Saturday.
- **Event selection**: `tod_type` can be `[CLY]_session` or a custom event key.
- **Date filtering**: `date_range` matches stored monthly keys (`YYYY:MM`).
- **Granular mode**: `fetchFromGranural` uses long-task aggregation with `period` and `periodOffset`.

---

## Error Responses

| HTTP Code | Error | Description |
|-----------|-------|-------------|
| 400 | `Something went wrong` | Database query failed |
| 401 | `Unauthorized` | Missing or invalid API key |

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `times_of_day` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Times Of Day Ingestion](./i-times-of-day.md) - Write path for counts

---

## Enterprise

Plugin: times-of-day
Endpoint: /o?method=times-of-day

## Last Updated

February 2026
