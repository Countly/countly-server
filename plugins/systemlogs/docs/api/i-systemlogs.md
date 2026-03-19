---
sidebar_label: "System Log Record"
---

# System Logs - Record

## Endpoint

```plaintext
/i/systemlogs
```

Ⓔ Enterprise Only

## Overview

Creates a system log entry with a custom action and optional payload data.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires an authenticated user context.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `action` | String | No | Action name to record. If omitted, no log entry is inserted and response is still success. |
| `data` | String (JSON Object) or Object | No | Payload saved to log field `i`. If sent as string, server attempts `JSON.parse(...)`. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `systemlogs.preventIPTracking` | `false` | Log insertion payload | When `true`, new records store `ip: null`; otherwise they store request IP. |

## Response

### Success Response

```json
{
  "result": "Success"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Always `Success` when authentication passes. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

- `400`

```json
{
  "result": "Token not valid"
}
```

- `401`

```json
{
  "result": "User does not exist"
}
```

- `401`

```json
{
  "result": "User does not have right"
}
```

- `401`

```json
{
  "result": "User is locked"
}
```

- `401`

```json
{
  "result": "Token is invalid"
}
```

## Behavior/Processing

- If `data` is a string and parsing fails, the endpoint logs a parse error server-side and continues with original value.
- If `data.before` and `data.update` are both provided, only changed fields are recorded (`before`/`after` diff snapshot).
- Every successful insert also updates `countly.systemlogs` metadata document `_id: "meta_v2"` for action filter values.

### Impact on Other Data

- Writes a new action log document to `countly.systemlogs`.
- Updates `countly.systemlogs` metadata document (`meta_v2`).

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.systemlogs` | System audit log storage | Inserts action record, updates metadata document (`meta_v2`). |
| `countly.members` | User attribution fallback | Reads user data when actor identity must be resolved from member record. |

---

## Examples

### Record app configuration change

```plaintext
/i/systemlogs?api_key=YOUR_API_KEY&action=app_updated&data={"app_id":"6991c75b024cb89cdc04efd2","before":{"timezone":"UTC"},"update":{"timezone":"Europe/Istanbul"}}
```

### Record user operation

```plaintext
/i/systemlogs?api_key=YOUR_API_KEY&action=user_deleted&data={"user_id":"65f1f7b2ad5b9b001f12ab34","name":"Test User"}
```

## Limitations

- Endpoint returns success response even when `action` is missing; no log record is created in that case.
- If `data` parse fails, payload may be stored without structured diff processing.

---

## Related Endpoints

- [System Logs - Query](o-systemlogs-query.md)
- [System Logs - Metadata](o-systemlogs-meta.md)

## Last Updated

2026-03-05
