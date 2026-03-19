---
sidebar_label: "Log Clear"
---

# Error Logs - Log Clear

## Endpoint

```plaintext
/i/errorlogs
```

## Overview

Clears (truncates to zero length) a selected Countly server log file.

## Authentication

Countly API supports three authentication methods:

1. **API Key** (parameter): `api_key=YOUR_API_KEY`
2. **Auth Token** (parameter): `auth_token=YOUR_AUTH_TOKEN`
3. **Auth Token** (header): `countly-token: YOUR_AUTH_TOKEN`


## Permissions

- Required permission: Global Admin.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `log` | String | Yes | Log key to clear (for example `api`, `dashboard`, or other discovered `countly-*.log` keys). |

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
| `result` | String | `Success` when log file was truncated. |

### Error Responses

- `200` (invalid log key)

```json
{
  "result": "Invalid log"
}
```

- `200` (truncate error)

```json
{
  "result": {
    "errno": -2,
    "code": "ENOENT",
    "syscall": "open",
    "path": "/path/to/log/countly-api.log"
  }
}
```

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

- Validates global-admin permissions.
- Discovers available logs from `log/` directory (`countly-*.log`) plus default `api` and `dashboard` mappings.
- Verifies provided `log` key exists.
- Dispatches audit event and truncates selected file.

### Impact on Other Data

- Truncates selected filesystem log file content.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `errologs_clear` | Valid log key is accepted for truncate operation | `{ log: selected_log_key }` |

## Database Collections

This endpoint does not read or write database collections.

## Examples

### Clear API log

```plaintext
/i/errorlogs?api_key=YOUR_API_KEY&log=api
```

### Clear dashboard log

```plaintext
/i/errorlogs?api_key=YOUR_API_KEY&log=dashboard
```

## Limitations

- Log key must map to a discovered `countly-*.log` file.
- Endpoint returns `200` for both success and many operation errors; check `result` content.

## Related Endpoints

- [Error Logs - Logs Read](o-errorlogs.md)
- [Error Logs - Log Read](o-errorlogs-log.md)

## Last Updated

2026-02-17
