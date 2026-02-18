---
sidebar_label: "Read Durations"
---

# /o/analytics/durations

## Endpoint

```plaintext
/o/analytics/durations
```

## Overview

Returns session duration bucket distribution for the selected period.

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
  {"ds": "7", "t": 403, "percent": "81.1"},
  {"ds": "3", "t": 42, "percent": "8.5"},
  {"ds": "4", "t": 18, "percent": "3.6"}
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Duration bucket rows sorted by count descending. |
| `[] .ds` | String | Duration bucket key. |
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
  - Reads `d-ranges` metadata and extracts duration range data for requested period.

### Impact on Other Data

- Read-only endpoint.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify read access. |
| `countly.apps` | App context validation | Reads app record (`timezone`, app state) for the requested `app_id`. |
| `countly.users{appId}` | Duration range source (`d-ranges`) and counts | Read for duration distribution output. |

---

## Examples

### Example 1: Read duration distribution

```plaintext
/o/analytics/durations?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=30days
```

## Limitations

- If duration range metadata is absent, response can be an empty array.

---

## Related Endpoints

- [Analytics - Read Loyalty](./o-analytics-loyalty.md)
- [Analytics - Read Frequency](./o-analytics-frequency.md)

## Last Updated

2026-02-17
