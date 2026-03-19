---
sidebar_label: "Disable"
---

# Two Factor Auth - Disable

## Endpoint

```plaintext
/i/two-factor-auth?method=disable
```

## Overview

Disables 2FA for the authenticated user.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires authenticated user context.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `disable`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `two-factor-auth.globally_enabled` | `false` | Disable flow | When `true`, user self-disable is blocked with `403`. |

## Response

### Success Response

```json
{
  "result": "Disabled 2FA for user"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Result message. |

### Error Responses

- `403`

```json
{
  "result": "Can not disable 2FA for user when it is globally enabled"
}
```

- `500`

```json
{
  "result": "Database error while disabling 2FA"
}
```

## Behavior/Processing

- Clears `two_factor_auth.secret_token` and sets `two_factor_auth.enabled=false`.
- Emits system log action: `two_factor_auth_disabled`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | User account settings | Disables user 2FA and removes stored secret. |
| `countly.systemlogs` | Audit trail | Receives `two_factor_auth_disabled` action. |

---

## Examples

### Disable 2FA for current user

```plaintext
/i/two-factor-auth?api_key=YOUR_API_KEY&method=disable
```

## Related Endpoints

- [Two Factor Auth - Enable](i-two-factor-auth-enable.md)
- [Two Factor Auth - Admin Disable](i-two-factor-auth-admin-disable.md)

## Last Updated

2026-03-05
