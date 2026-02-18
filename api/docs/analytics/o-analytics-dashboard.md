---
sidebar_label: "Read Dashboard"
---

# /o/analytics/dashboard

## Endpoint

```plaintext
/o/analytics/dashboard
```

## Overview

Returns dashboard summary cards and top breakdowns for one or more periods.

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
| `period` | String | No | Requested period. Default: `30days`. |
| `timezone` | String | No | Optional timezone override for period calculation. |
| `timestamp` | Number | No | Optional reference timestamp. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.total_users` | `true` | Total user estimation | When disabled, total-user correction path is skipped. |
| `api.metric_changes` | `true` | Total user correction history | When disabled, change-history adjustments are not applied. |

## Response

### Success Response

```json
{
  "30days": {
    "dashboard": {
      "total_sessions": {"total": 497, "change": "-1%", "trend": "d"},
      "new_users": {"total": 43, "change": "-23.2%", "trend": "d"},
      "total_users": {"total": 56, "change": "-1.8%", "trend": "d", "is_estimate": false},
      "total_time": {"total": "0.5 years", "change": "-11.1%", "trend": "d"},
      "avg_time": {"total": "8.1 hours", "change": "-10.2%", "trend": "d"},
      "avg_requests": {"total": "0.0", "change": "NA", "trend": "u"}
    },
    "top": {
      "platforms": [{"name": "iOS", "value": 236, "percent": 47.5}],
      "resolutions": [{"name": "600x1024", "value": 50, "percent": 10.4}],
      "carriers": [{"name": "Metro Pcs", "value": 58, "percent": 11.8}],
      "users": [{"name": "5 Feb", "value": 28, "percent": 6.2}]
    },
    "period": "18 Jan - 16 Feb"
  },
  "7days": {
    "dashboard": {
      "total_sessions": {"total": 33, "change": "-76.9%", "trend": "d"}
    },
    "top": {
      "platforms": [{"name": "Android", "value": 18, "percent": 54.5}]
    },
    "period": "10 Feb - 16 Feb"
  },
  "today": {
    "dashboard": {
      "total_sessions": {"total": 0, "change": "100%", "trend": "d"}
    },
    "top": {
      "platforms": []
    },
    "period": "16 Feb"
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `period_key` | Object | Dashboard block for each returned period key. |
| `period_key.dashboard` | Object | Main summary cards. |
| `period_key.dashboard.total_users.is_estimate` | Boolean | Whether total users value was estimated/corrected. |
| `period_key.top` | Object | Top lists for platforms, resolutions, carriers, and users. |
| `period_key.top.list[]` | Array | Rows with `name`, `value`, `percent`. |
| `period_key.period` | String | Human-readable date range. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{"result":"Missing parameter \"api_key\" or \"auth_token\""}
```

**Status Code**: `400 Bad Request`
```json
{"result":"Missing parameter \"app_id\""}
```

**Status Code**: `401 Unauthorized`
```json
{"result":"User does not have right"}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Default dashboard blocks | `period` is omitted or `period=30days` | Reads user/device/carrier aggregates, then computes three blocks (`30days`, `7days`, `hour->today`). | Raw root object keyed by `30days`, `7days`, `today`. |
| Custom period block | `period` is provided and not `30days` | Reads same aggregate sources but computes one period only. | Raw root object keyed by the requested period value. |

### Impact on Other Data

- Read-only endpoint. Does not modify stored analytics data.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify read access. |
| `countly.apps` | App context validation | Reads app record (`timezone`, app state) for the requested `app_id`. |
| `countly.users{appId}` | Session/user aggregates and trend metrics | Read to build dashboard cards and user timeline bars. |
| `countly.device_details{appId}` | Platform/resolution aggregates | Read to build platform and resolution top lists. |
| `countly.carriers{appId}` | Carrier aggregates | Read to build carrier top list. |
| `countly.app_users{appId}` | Total-user correction baseline | Read when total-user estimation is enabled. |
| `countly.metric_changes{appId}` | Total-user correction deltas | Read when metric-change correction is enabled. |

---

## Examples

### Example 1: Read default dashboard blocks

```plaintext
/o/analytics/dashboard?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2
```

### Example 2: Read one custom period block

```plaintext
/o/analytics/dashboard?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=7days
```

## Operational Considerations

- This endpoint loads multiple aggregate collections for each period key.
- Wider/custom periods increase aggregation cost.

---

## Related Endpoints

- [Analytics - Read Countries](./o-analytics-countries.md)
- [Analytics - Read Sessions](./o-analytics-sessions.md)
- [Analytics - Read Tops](./o-analytics-tops.md)

## Last Updated

2026-02-17
