---
sidebar_label: "Feature State Check"
---

# /o/plugins-check

## Endpoint

```plaintext
/o/plugins-check
```

## Overview

Returns the current global feature-operation status marker derived from the plugins collection.

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

## Response

### Success Response

```json
{
  "result": "completed"
}
```

Alternative successful status responses:

```json
{
  "result": "busy"
}
```

```json
{
  "result": "failed"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Global status marker: `completed`, `busy`, or `failed`. |

### Error Responses

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
| Failed | `_id: "failed"` marker exists, or marker-query error | Returns failed marker result. | Wrapped object: `{ "result": "failed" }` |
| Busy | No failed marker and `_id: "busy"` exists | Returns busy marker result. | Wrapped object: `{ "result": "busy" }` |
| Completed | No failed marker and no busy marker | Returns completed marker result. | Wrapped object: `{ "result": "completed" }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Global-admin validation | Reads authenticated user and global-admin status. |
| `countly.plugins` | Stores global operation marker documents | Reads marker documents with `_id` values `failed` and `busy`. |

## Examples

### Check current feature-operation status

```plaintext
/o/plugins-check?api_key=YOUR_API_KEY
```

## Limitations

- Status is global and not per-feature.
- Endpoint always reports marker state only; it does not include progress details.

## Related Endpoints

- [Features - Feature State Update](i-plugins.md)
- [Features - Feature List](o-plugins.md)

## Last Updated

2026-02-17
