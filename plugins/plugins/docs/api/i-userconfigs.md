---
sidebar_label: "User Config Update"
---

# /i/userconfigs

## Endpoint

```plaintext
/i/userconfigs
```

## Overview

Updates user-level configuration overrides for the authenticated global admin user. The endpoint stores the provided overrides under member settings and returns user-scoped configuration values.

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
| `configs` | JSON String (Object) | Yes | JSON-stringified object of user-level setting overrides. |

### `configs` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `{namespace}` | Object | Yes | Configuration namespace for user override (for example `frontend`). |
| `{namespace}.{setting}` | Varies | Yes | User-level value to store under member settings. |

Example `configs` payload:

```json
{
  "frontend": {
    "session_timeout": 15
  }
}
```

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `member.settings.{namespace}.{setting}` | No override | Response content | Stored user-level overrides determine what values are returned in the user config response payload. |

## Response

### Success Response

```json
{
  "frontend": {
    "session_timeout": 15
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | User-level configuration map returned as raw root payload. |
| `{namespace}` | Object | Namespace containing user-scoped settings. |
| `{namespace}.{setting}` | Varies | User-specific setting value. |

### Error Responses

`400 Bad Request`

```json
{
  "result": "Error updating configs"
}
```

`400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

`400 Bad Request`

```json
{
  "result": "Token not valid"
}
```

`401 Unauthorized`

```json
{
  "result": "User does not exist"
}
```

`401 Unauthorized`

```json
{
  "result": "User does not have right"
}
```

`401 Unauthorized`

```json
{
  "result": "User is locked"
}
```

`401 Unauthorized`

```json
{
  "result": "Token is invalid"
}
```

## Behavior/Processing

- Parses `configs` as JSON; empty or invalid payload returns `Error updating configs`.
- Merges submitted values into the authenticated member's `settings` object.
- If `frontend.session_timeout` is provided, updates TTL/expiry fields in the authenticated user's active login tokens.
- Returns user-scoped config values after update flow.

### Impact on Other Data

- Updates `settings.*` fields on the authenticated user document in `countly.members`.
- May update token expiry metadata in `countly.auth_tokens`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Stores dashboard user profile and settings | Updates authenticated user's `settings.{namespace}.{setting}` values. |
| `countly.auth_tokens` | Stores active dashboard auth tokens | Updates `ttl` and `ends` for authenticated user's `LoggedInAuth` tokens when session timeout is provided. |

## Examples

### Set user-level frontend session timeout

```plaintext
/i/userconfigs?api_key=YOUR_API_KEY&configs={"frontend":{"session_timeout":15}}
```

### Set multiple user-level frontend preferences

```plaintext
/i/userconfigs?api_key=YOUR_API_KEY&configs={"frontend":{"session_timeout":20,"table_rows":50}}
```

## Limitations

- This endpoint updates the authenticated global admin user only.
- Invalid JSON input is treated as an empty update and returns `Error updating configs`.

## Related Endpoints

- [Features - Global Config Update](i-configs.md)
- [Features - Global Config Read](o-configs.md)

## Last Updated

2026-02-17
