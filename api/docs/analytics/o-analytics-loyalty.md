---
sidebar_label: "Analytics Loyalty Read"
---

# /o/analytics/loyalty

## Endpoint

```plaintext
/o/analytics/loyalty
```

## Overview

Returns loyalty bucket distribution for the selected period.

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
| `period` | String | No | Requested period for bucket extraction. |
| `timezone` | String | No | Optional timezone override. |
| `timestamp` | Number | No | Optional reference timestamp. |

## Response

### Success Response

```json
[
  {"l": "0", "t": 121, "percent": "45.4"},
  {"l": "1", "t": 98, "percent": "36.8"},
  {"l": "2", "t": 47, "percent": "17.8"}
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Loyalty bucket rows sorted by count descending. |
| `[] .l` | String | Loyalty bucket key. |
| `[] .t` | Number | Bucket count. |
| `[] .percent` | String | Bucket percentage as string. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{"result":"Missing parameter \"api_key\" or \"auth_token\""}
```

**Status Code**: `400 Bad Request`
```json
{"result":"Missing parameter \"app_id\""}
```

## Behavior/Processing

### Behavior Modes

- Single mode:
  - Reads `l-ranges` metadata and extracts loyalty range data for requested period.

### Impact on Other Data

- Read-only endpoint.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify read access. |
| `countly.apps` | App context validation | Reads app record (`timezone`, app state) for the requested `app_id`. |
| `countly.users{appId}` | Loyalty range source (`l-ranges`) and counts | Read for loyalty distribution output. |

---

## Examples

### Example 1: Read loyalty distribution

```plaintext
/o/analytics/loyalty?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=30days
```

## Limitations

- If loyalty range metadata is absent, response can be an empty array.

---

## Related Endpoints

- [Analytics - Read Frequency](./o-analytics-frequency.md)
- [Analytics - Read Durations](./o-analytics-durations.md)

## Last Updated

2026-02-17
