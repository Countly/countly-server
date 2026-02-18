---
sidebar_label: "Read Sessions"
---

# /o/analytics/sessions

## Endpoint

```plaintext
/o/analytics/sessions
```

## Overview

Returns session aggregates as subperiod points for the requested period.

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
| `period` | String | No | Requested period (for example `7days`, `30days`, `hour`). |
| `bucket` | String | No | Bucket override (`daily` or `monthly`). |
| `timezone` | String | No | Optional timezone override. |
| `timestamp` | Number | No | Optional reference timestamp. |

## Response

### Success Response

```json
[
  {"_id": "2026-2-10", "t": 9, "n": 0, "u": 0, "d": 149523, "e": 0},
  {"_id": "2026-2-11", "t": 7, "n": 0, "u": 0, "d": 122609, "e": 0},
  {"_id": "2026-2-12", "t": 7, "n": 0, "u": 0, "d": 203095, "e": 0}
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Session subperiod rows. |
| `[] ._id` | String | Period bucket identifier. |
| `[] .t` | Number | Session count. |
| `[] .n` | Number | New users count in bucket. |
| `[] .u` | Number | Unique users count in bucket. |
| `[] .d` | Number | Session duration sum in bucket. |
| `[] .e` | Number | Event count aggregate in bucket. |

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
| Default subperiod mode | `bucket` is omitted | Loads session aggregate document and returns `getSubperiodData()` output for the resolved period. | Raw root array of session points. |
| Bucket override mode | `bucket=daily` or `bucket=monthly` | Loads same session aggregate document and applies bucket grouping before returning data. | Raw root array of session points grouped by selected bucket. |

### Impact on Other Data

- Read-only endpoint.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify read access. |
| `countly.apps` | App context validation | Reads app record (`timezone`, app state) for the requested `app_id`. |
| `countly.users{appId}` | Session aggregate source | Read to build subperiod session timeline. |

---

## Examples

### Example 1: Read 7-day session timeline

```plaintext
/o/analytics/sessions?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=7days
```

### Example 2: Read monthly bucketed timeline

```plaintext
/o/analytics/sessions?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=30days&
  bucket=monthly
```

## Operational Considerations

- Larger periods return more points and can increase response size.

---

## Related Endpoints

- [Analytics - Read Dashboard](./o-analytics-dashboard.md)
- [Analytics - Read Loyalty](./o-analytics-loyalty.md)
- [Analytics - Read Frequency](./o-analytics-frequency.md)

## Last Updated

2026-02-17
