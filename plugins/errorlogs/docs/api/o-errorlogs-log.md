---
sidebar_label: "Log Read"
---

# Error Logs - Log Read

## Endpoint

```plaintext
/o/errorlogs?log={log_key}
```

## Overview

Returns one selected Countly log file, either as text response or as downloadable attachment.

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
| `log` | String | No | Log key to read (for example `api`, `dashboard`, or discovered `countly-*.log` key). If omitted or invalid, endpoint returns all logs map. |
| `bytes` | Number | No | If greater than `0`, returns only the last N bytes (aligned to first full line in the read chunk). |
| `download` | Boolean/String | No | When truthy, returns raw text as attachment instead of JSON string response. |

## Response

### Success Response

Text mode (default):

```json
"2026-02-17 10:00:00 [INFO] API started\n2026-02-17 10:01:12 [WARN] Slow query"
```

Download mode (`download=true`):

```text
Content-Type: plain/text; charset=utf-8
Content-Disposition: attachment; filename=countly-api.log

2026-02-17 10:00:00 [INFO] API started
2026-02-17 10:01:12 [WARN] Slow query
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | String | Log text when not downloading. |

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

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Text mode | `download` not provided/false | Reads full/tail file content and returns via JSON output helper. | Raw root string log text. |
| Download mode | `download=true` | Reads full/tail file content and returns raw body with attachment headers. | Raw text attachment payload. |
| Fallback mode | `log` missing or unknown key | Falls back to all-log map behavior from `/o/errorlogs`. | Raw root object (`log_key -> log_text`). |

## Database Collections

This endpoint does not read or write database collections.

## Examples

### Read API log as text

```plaintext
/o/errorlogs?api_key=YOUR_API_KEY&log=api
```

### Download last 5000 bytes of dashboard log

```plaintext
/o/errorlogs?api_key=YOUR_API_KEY&log=dashboard&bytes=5000&download=true
```

## Limitations

- If file read fails, the endpoint returns empty string for that log content.
- `download` mode changes response from JSON string to raw attachment output.

## Related Endpoints

- [Error Logs - Logs Read](o-errorlogs.md)
- [Error Logs - Log Clear](i-errorlogs.md)

## Last Updated

2026-02-17
