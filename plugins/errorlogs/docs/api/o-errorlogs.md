---
sidebar_label: "Logs Read"
---

# Error Logs - Logs Read

## Endpoint

```plaintext
/o/errorlogs
```

## Overview

Returns discovered Countly log file contents as a key-value map (`log_key -> log_text`).

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
| `bytes` | Number | No | If greater than `0`, returns only the last N bytes (aligned to first full line in the read chunk) from each log. |

## Response

### Success Response

```json
{
  "api": "2026-02-17 10:00:00 [INFO] API started\n...",
  "dashboard": "2026-02-17 10:00:01 [INFO] Dashboard started\n..."
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Raw map of discovered log keys to log text content. |
| `{log_key}` | String | Log content for that key (full or tail text based on `bytes`). |

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

- Validates global-admin permissions.
- Discovers log files matching `countly-*.log` in server log directory.
- Reads each log file (full content or tail bytes).
- Returns discovered logs as one object map.
- Read failures per file return empty string for that file key.

## Database Collections

This endpoint does not read or write database collections.

## Examples

### Read all logs (full)

```plaintext
/o/errorlogs?api_key=YOUR_API_KEY
```

### Read last 2000 bytes from each log

```plaintext
/o/errorlogs?api_key=YOUR_API_KEY&bytes=2000
```

## Limitations

- Output size can be large when `bytes` is omitted.
- Individual file read failures do not fail the whole response; affected log values are empty strings.

## Related Endpoints

- [Error Logs - Single Log Read](o-errorlogs-log.md)
- [Error Logs - Log Clear](i-errorlogs.md)

## Last Updated

2026-02-17
