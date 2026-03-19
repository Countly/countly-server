---
sidebar_label: "Admin Disable"
---

# Two Factor Auth - Admin Disable

## Endpoint

```plaintext
/i/two-factor-auth?method=admin_disable
```

## Overview

Disables 2FA for a target user (admin operation).

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
| `method` | String | Yes | Must be `admin_disable`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `uid` | String | Yes | Target user id. |

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

- `400`

```json
{
  "result": "User id required"
}
```

- `500`

```json
{
  "result": "Database error while disabling 2FA"
}
```

- `404`

```json
{
  "result": "User does not exist"
}
```

## Behavior/Processing

- Sets `two_factor_auth.enabled=false` and removes `two_factor_auth.secret_token` for target user.
- Emits system log action: `two_factor_auth_disabled` with `user_id` payload.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | User account settings | Disables target user 2FA and removes secret. |
| `countly.systemlogs` | Audit trail | Receives `two_factor_auth_disabled` action. |

---

## Examples

### Admin disable target user 2FA

```plaintext
/i/two-factor-auth?api_key=YOUR_API_KEY&method=admin_disable&uid=65f1f7b2ad5b9b001f12ab34
```

## Related Endpoints

- [Two Factor Auth - Admin Check](i-two-factor-auth-admin-check.md)

## Last Updated

2026-03-05
