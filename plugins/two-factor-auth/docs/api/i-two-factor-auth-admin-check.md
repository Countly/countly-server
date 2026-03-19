---
sidebar_label: "Admin Check"
---

# Two Factor Auth - Admin Check

## Endpoint

```plaintext
/i/two-factor-auth?method=admin_check
```

## Overview

Returns whether a target user currently has 2FA enabled.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires Global Admin.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `admin_check`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `uid` | String | Yes | Target user id. |

## Response

### Success Response

```json
{
  "result": "true"
}
```

or

```json
{
  "result": "false"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | String boolean (`"true"` or `"false"`). |

### Error Responses

- `400`

```json
{
  "result": "User id required"
}
```

- `404`

```json
{
  "result": "User does not exist"
}
```

- `500`

```json
{
  "result": "Database error while checking 2FA"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Admin check success | Global admin and valid `uid` that exists | Reads member record and checks `two_factor_auth.enabled`. | Wrapped `result` string: `"true"` or `"false"`. |
| Validation failure | Missing `uid` | Stops before DB read. | Wrapped error in `result`. |
| Missing user | Valid `uid` but member not found | Returns not-found response. | Wrapped error in `result`. |
| Database failure | DB read error | Returns server error. | Wrapped error in `result`. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | User account lookup | Reads `two_factor_auth.enabled` for target user. |

---

## Examples

### Check user 2FA status

```plaintext
/i/two-factor-auth?api_key=YOUR_API_KEY&method=admin_check&uid=65f1f7b2ad5b9b001f12ab34
```

## Related Endpoints

- [Two Factor Auth - Admin Disable](i-two-factor-auth-admin-disable.md)

## Last Updated

2026-03-05
