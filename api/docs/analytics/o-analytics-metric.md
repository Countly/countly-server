---
sidebar_label: "Read Metric"
---

# /o/analytics/metric

## Endpoint

```plaintext
/o/analytics/metric
```

## Overview

Returns one metric breakdown array for the requested metric key.

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
| `metric` | String | Yes | Metric key to read (for example `countries`, `carriers`, `platforms`, `resolutions`, `devices`, `app_versions`). |
| `period` | String | No | Requested period. |
| `timezone` | String | No | Optional timezone override. |
| `timestamp` | Number | No | Optional reference timestamp. |

## Parameter Semantics

- If `metric` is missing, request fails.
- If `metric` does not map to a supported collection path, response is an empty array (`[]`).
- Common metric mappings:
  - `countries` -> users aggregate countries
  - `platforms`/`os` -> device details OS
  - `resolutions` -> device details resolutions
  - `carriers` -> carriers aggregate

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.total_users` | `true` | Unique-user correction | When disabled, total-user correction path is skipped. |
| `api.metric_changes` | `true` | Correction history | When disabled, metric-change historical adjustments are not applied. |

## Response

### Success Response

```json
[
  {"_id": "US", "t": 10, "n": 0, "u": 3},
  {"_id": "DE", "t": 4, "n": 0, "u": 2},
  {"_id": "NZ", "t": 3, "n": 0, "u": 2}
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Metric rows for the selected metric. |
| `[] ._id` | String | Segment value (for example country code, carrier name, platform). |
| `[] .t` | Number | Total count for segment. |
| `[] .n` | Number | New-user count for segment. |
| `[] .u` | Number | Unique-user count for segment. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{"result":"Must provide metric"}
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
| Supported metric | `metric` maps to a known collection | Resolves metric mapping and returns extracted metric rows (with total-user correction when enabled). | Raw root array of metric rows. |
| Unsupported metric | `metric` does not map to a collection | Stops after mapping check without querying metric data. | Raw root empty array: `[]`. |

### Impact on Other Data

- Read-only endpoint.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify read access. |
| `countly.apps` | App context validation | Reads app record (`timezone`, app state) for the requested `app_id`. |
| `countly.users{appId}` | Countries/session/user metric source | Read for user-level aggregate metrics. |
| `countly.device_details{appId}` | Platform/resolution/app-version metric source | Read for device aggregate metrics. |
| `countly.devices{appId}` | Device/manufacturer metric source | Read for device category metrics. |
| `countly.cities{appId}` | City metric source | Read for city-based metric output. |
| `countly.app_users{appId}` | Total-user correction baseline | Read during total-user correction flows. |
| `countly.metric_changes{appId}` | Correction history | Read when metric-change correction is enabled. |

---

## Examples

### Example 1: Read countries metric

```plaintext
/o/analytics/metric?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  metric=countries&
  period=7days
```

### Example 2: Read platforms metric

```plaintext
/o/analytics/metric?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  metric=platforms&
  period=30days
```

## Operational Considerations

- High-cardinality metrics produce larger result arrays.

## Limitations

- Unsupported metric keys return `[]` instead of a validation error.

---

## Related Endpoints

- [Analytics - Read Tops](./o-analytics-tops.md)
- [Analytics - Read Countries](./o-analytics-countries.md)
- [Analytics - Run Query](./o-query.md)

## Last Updated

2026-02-17
