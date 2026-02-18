---
sidebar_label: "Read Countries"
---

# /o/analytics/countries

## Endpoint

```plaintext
/o/analytics/countries
```

## Overview

Returns top-country aggregates in fixed output blocks: `30days`, `7days`, and `today`.

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
| `period` | String | No | Accepted but ignored by this endpoint. Response always includes fixed blocks. |
| `timezone` | String | No | Optional timezone override. |
| `timestamp` | Number | No | Optional reference timestamp. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.total_users` | `true` | Unique-user correction | When disabled, total-user correction path is skipped. |
| `api.metric_changes` | `true` | Correction history | When disabled, change-history adjustments are not applied. |

## Response

### Success Response

```json
{
  "30days": [
    {"country": "United States", "code": "us", "t": 121, "u": 14, "n": 11},
    {"country": "Spain", "code": "es", "t": 87, "u": 10, "n": 6}
  ],
  "7days": [
    {"country": "United States", "code": "us", "t": 10, "u": 3, "n": 0}
  ],
  "today": [
    {"country": "United States", "code": "us", "t": 1, "u": 1, "n": 0}
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `30days` | Array | Country rows for last 30 days. |
| `7days` | Array | Country rows for last 7 days. |
| `today` | Array | Country rows for current day/hour window. |
| `period[].country` | String | Country display name. |
| `period[].code` | String | Lowercase ISO country code. |
| `period[].t` | Number | Total sessions for that country. |
| `period[].u` | Number | Total users for that country. |
| `period[].n` | Number | New users for that country. |

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
{"result":"App does not exist"}
```

## Behavior/Processing

### Behavior Modes

- Single mode:
  - Internally computes three periods (`30days`, `7days`, `hour`) and returns them as `30days`, `7days`, `today`.

### Impact on Other Data

- Read-only endpoint. Does not update country aggregates.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify read access. |
| `countly.apps` | App context validation | Reads app record (`timezone`, app state) for the requested `app_id`. |
| `countly.users{appId}` | Country/session aggregate source | Read to build country ranking per fixed period block. |
| `countly.app_users{appId}` | Total-user correction baseline | Read when total-user correction is enabled. |
| `countly.metric_changes{appId}` | Correction history | Read when metric-change correction is enabled. |

---

## Examples

### Example 1: Read country metrics

```plaintext
/o/analytics/countries?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2
```

## Operational Considerations

- Output is fixed to three blocks regardless of supplied `period`.
- Country list is limited to top countries by internal ranking.

---

## Related Endpoints

- [Analytics - Read Dashboard](./o-analytics-dashboard.md)
- [Analytics - Read Metric](./o-analytics-metric.md)

## Last Updated

2026-02-17
