---
sidebar_label: "Enforcement Read"
---

# SDK - Enforcement Read

## Endpoint

```plaintext
/o?method=sdk-enforcement
```

## Overview

Returns enforcement overrides used to filter SDK config values.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `sdk` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `sdk-enforcement`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | App id. |

## Response

### Success Response

```json
{
  "tracking": true,
  "crt": false,
  "bom_rqp": 50
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Enforcement object stored for app. |

### Error Responses

- `400`

```json
{
  "result": "Error: undefined"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Enforcement exists | App has `sdk_enforcement` document | Reads document and returns `enforcement` object. | Raw object of enforcement flags/values. |
| No enforcement doc | No matching document for app | Returns empty object fallback. | `{}` |
| Read failure | Read operation rejects/errors | Returns wrapped error response. | Wrapped error in `result`. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_out.sdk_enforcement` | Enforcement source | Reads per-app enforcement document. |

---

## Examples

### Read enforcement

```plaintext
/o?method=sdk-enforcement&api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2
```

## Related Endpoints

- [SDK - Enforcement Update](i-sdk-config-enforcement.md)
- [SDK - SDK Config Read](o-sdk-config.md)

## Last Updated

2026-03-05
