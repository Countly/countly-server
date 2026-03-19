---
sidebar_label: "Global Config Update"
---

# /i/configs

## Endpoint

```plaintext
/i/configs
```

## Overview

Updates global Countly configuration values stored in the plugins configuration document. This endpoint accepts a JSON object of config changes, persists them, reloads configuration in memory, and returns the updated global configuration object.

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
| `configs` | JSON String (Object) | Yes | JSON-stringified object of configuration changes. |

### `configs` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `{namespace}` | Object | Yes | Configuration namespace to update (for example `api`, `frontend`, or feature namespace). |
| `{namespace}.{setting}` | Varies | Yes | Setting value to update under that namespace. |

Example `configs` payload:

```json
{
  "frontend": {
    "session_timeout": 30
  },
  "api": {
    "country_data": false
  }
}
```

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `frontend.session_timeout` | Server-defined | Auth token lifetime | Updates `ttl` and `ends` for authenticated user's `LoggedInAuth` tokens when no user-level frontend override exists. |
| `api.country_data` | `true` | Geo data collection behavior | When set to `false`, endpoint also forces `api.city_data=false` in stored config. |
| `api.city_data` | `true` | Geo data collection behavior | If set to `true` while `api.country_data=false`, endpoint forces `api.country_data=true`. |

## Response

### Success Response

```json
{
  "api": {
    "country_data": false,
    "city_data": false
  },
  "frontend": {
    "session_timeout": 30
  },
  "plugins": {
    "drill": true,
    "crashes": true
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Global configuration object returned as a raw root payload. |
| `{namespace}` | Object | Namespace-level configuration map. |
| `{namespace}.{setting}` | Varies | Effective setting value after update and reload. |

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

- Parses `configs` as JSON; an empty or invalid payload returns `Error updating configs`.
- Merges provided changes into existing config state and writes them to `countly.plugins`.
- Reloads configuration before returning the response payload.
- When `frontend.session_timeout` is provided, token TTL/expiry fields are updated for active login tokens unless a user-level frontend override exists.
- If `api.country_data` is set to `false`, `api.city_data` is also forced to `false` in the update logic.
- If `api.city_data` is set to `true` while `api.country_data` is `false`, `api.country_data` is forced to `true`.

### Impact on Other Data

- Updates the global plugin/config document in `countly.plugins`.
- May update active login token TTL fields in `countly.auth_tokens`.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `change_configs` | Config payload is valid and update flow starts | `{ before: previous configs, update: submitted configs }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Global-admin validation | Reads authenticated user and global-admin status. |
| `countly.plugins` | Stores global feature/config namespaces | Updates flattened configuration keys under `_id: "plugins"`. |
| `countly.auth_tokens` | Stores active dashboard auth tokens | Conditionally updates `ttl` and `ends` for `LoggedInAuth` tokens of the authenticated user. |

## Examples

### Update global frontend session timeout

```plaintext
/i/configs?api_key=YOUR_API_KEY&configs={"frontend":{"session_timeout":30}}
```

### Disable country-level API geo enrichment (also disables city-level)

```plaintext
/i/configs?api_key=YOUR_API_KEY&configs={"api":{"country_data":false}}
```

## Operational Considerations

- Config changes are persisted and reloaded immediately in this process.
- In multi-process deployments, expect short propagation delay until all processes refresh shared state.

## Limitations

- `configs` must be valid JSON and non-empty.
- Invalid JSON is handled as an empty payload and returns `Error updating configs`.

## Related Endpoints

- [Features - Global Config Read](o-configs.md)
- [Features - User Config Update](i-userconfigs.md)
- [Features - Feature State Update](i-plugins.md)

## Last Updated

2026-02-17
