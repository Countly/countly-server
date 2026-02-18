---
sidebar_label: "Feature State Update"
---

# /i/plugins

## Endpoint

```plaintext
/i/plugins
```

## Overview

Updates feature enablement state by applying a JSON object passed in the `plugin` parameter. The endpoint writes feature flags into the plugins configuration document, logs the change, reloads configuration, and returns a start confirmation.

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
| `plugin` | JSON String (Object) | Yes | JSON-stringified map of feature state updates. |

### `plugin` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `{feature_code}` | Boolean | Yes | `true` to enable, `false` to disable the feature. |

Example `plugin` payload:

```json
{
  "drill": true,
  "cohorts": false
}
```

## Response

### Success Response

Accepted update:

```json
{
  "result": "started"
}
```

Parameter-rejected branch:

```json
"Not enough parameters"
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Returns `started` when feature state update is accepted. |
| `(root value)` | String | Returns `Not enough parameters` when `plugin` is missing or set to `plugins`. |

### Error Responses

`200 OK` (missing or reserved parameter)

```json
"Not enough parameters"
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

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Update mode | `plugin` exists and is not equal to `"plugins"` | Parses `plugin` JSON, updates `plugins.{feature}` keys in `countly.plugins`, logs action, reloads configs. | Wrapped object: `{ "result": "started" }` |
| Parameter-rejected mode | `plugin` missing or `plugin=plugins` | Skips update path. | Raw root string: `"Not enough parameters"` |

### Impact on Other Data

- Updates feature flags under `_id: "plugins"` in `countly.plugins`.
- Reloads in-memory plugin config state used by API processes.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `change_plugins` | Valid `plugin` object is persisted | `{ before: feature map before change, update: submitted feature map }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Global-admin validation | Reads authenticated user and global-admin status. |
| `countly.plugins` | Stores feature enablement/configuration state | Updates `plugins.{feature_code}` keys under `_id: "plugins"`. |

## Examples

### Enable two features

```plaintext
/i/plugins?api_key=YOUR_API_KEY&plugin={"drill":true,"cohorts":true}
```

### Disable a feature

```plaintext
/i/plugins?api_key=YOUR_API_KEY&plugin={"crashes":false}
```

## Operational Considerations

- This endpoint accepts a configuration update and returns immediately.
- Validate resulting state with [Features - State Check](o-plugins-check.md).

## Limitations

- `plugin` must be a JSON object. Non-object values are not valid for update logic.
- Passing `plugin=plugins` is explicitly rejected.
- Invalid JSON in `plugin` can result in no update and no explicit error payload.

## Related Endpoints

- [Features - State Check](o-plugins-check.md)
- [Features - Feature List](o-plugins.md)
- [Features - Global Config Read](o-configs.md)

## Last Updated

2026-02-17
