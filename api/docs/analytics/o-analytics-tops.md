---
sidebar_label: "Read Tops"
---

# /o/analytics/tops

## Endpoint

```plaintext
/o/analytics/tops
```

## Overview

Returns top lists for built-in categories or requested metric keys.

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
| `period` | String | No | Requested period. |
| `metric` | String | No | Single metric key mode. |
| `metrics` | JSON String (Array) or Array | No | Multi-metric mode. |
| `timezone` | String | No | Optional timezone override. |
| `timestamp` | Number | No | Optional reference timestamp. |

## Parameter Semantics

- If `metric` is set, endpoint returns one array result.
- If `metrics` is set, endpoint returns an object keyed by each metric.
- If `metrics` parsing fails, endpoint returns `{}`.
- If neither `metric` nor `metrics` is set, endpoint returns built-in top lists.

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.total_users` | `true` | Metric/metrics mode unique-user correction | When disabled, total-user correction is skipped in metric-based branches. |
| `api.metric_changes` | `true` | Metric/metrics correction history | When disabled, metric-change correction is not applied. |

## Response

### Success Response

Default mode (no `metric` / `metrics`):

```json
{
  "platforms": [{"name": "iOS", "value": 236, "percent": 47.5}],
  "resolutions": [{"name": "600x1024", "value": 50, "percent": 10.4}],
  "carriers": [{"name": "Metro Pcs", "value": 58, "percent": 11.8}],
  "countries": [{"name": "United States", "value": 121, "percent": 24.5}]
}
```

Single metric mode (`metric=countries`):

```json
[
  {"name": "United States", "value": 121, "percent": 24.5},
  {"name": "Spain", "value": 87, "percent": 17.6}
]
```

Multi-metric mode (`metrics=["countries","platforms"]`):

```json
{
  "countries": [{"name": "United States", "value": 121, "percent": 24.5}],
  "platforms": [{"name": "iOS", "value": 236, "percent": 47.5}]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `platforms` | Array | Default mode top platforms. |
| `resolutions` | Array | Default mode top resolutions. |
| `carriers` | Array | Default mode top carriers. |
| `countries` | Array | Default mode top countries or metric result key. |
| `metric_name` | Array | Metric-mode list for requested metric(s). |
| `list[].name` | String | Segment display name. |
| `list[].value` | Number | Segment aggregate value. |
| `list[].percent` | Number | Segment percentage share. |

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
| Default tops mode | `metric` and `metrics` are both omitted | Reads users/device_details/carriers aggregates and returns built-in top lists. | Raw root object with keys like `platforms`, `resolutions`, `carriers`, `countries`. |
| Single metric mode | `metric` is provided | Resolves metric-to-collection mapping and returns one top list for that metric. | Raw root array. |
| Multi-metric mode | `metrics` is provided as array/JSON string array | Resolves each metric and returns one list per metric key. | Raw root object keyed by metric names. |

### Impact on Other Data

- Read-only endpoint.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify read access. |
| `countly.apps` | App context validation | Reads app record (`timezone`, app state) for the requested `app_id`. |
| `countly.users{appId}` | Countries/users aggregate source | Read for default and metric branches. |
| `countly.device_details{appId}` | Platform/resolution aggregate source | Read for default and metric branches. |
| `countly.carriers{appId}` | Carrier aggregate source | Read for default and metric branches. |
| `countly.app_users{appId}` | Total-user correction baseline | Read in metric/metrics branches when correction is enabled. |
| `countly.metric_changes{appId}` | Correction history | Read in metric/metrics branches when correction history is enabled. |

---

## Examples

### Example 1: Built-in top lists

```plaintext
/o/analytics/tops?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=30days
```

### Example 2: One metric

```plaintext
/o/analytics/tops?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  metric=countries&
  period=30days
```

### Example 3: Multiple metrics

```plaintext
/o/analytics/tops?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  metrics=["countries","platforms"]&
  period=30days
```

## Operational Considerations

- Metric branches may query additional collections and correction sources.
- High-cardinality metrics can increase response size.

## Limitations

- Invalid `metrics` JSON returns `{}`.
- Unsupported metric keys return empty arrays in metric-mode results.

---

## Related Endpoints

- [Analytics - Read Metric](./o-analytics-metric.md)
- [Analytics - Read Dashboard](./o-analytics-dashboard.md)
- [Analytics - Run Query](./o-query.md)

## Last Updated

2026-02-17
