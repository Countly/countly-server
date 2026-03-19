---
sidebar_label: "Enable"
---

# Two Factor Auth - Enable

## Endpoint

```plaintext
/i/two-factor-auth?method=enable
```

## Overview

Enables 2FA for the authenticated user after validating a 6-digit auth code against the provided secret token.

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
| `method` | String | Yes | Must be `enable`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `secret_token` | String | Yes | Secret used for TOTP verification. |
| `auth_code` | String | Yes | 6-digit TOTP code. Must match `^\d{6}$`. |

## Response

### Success Response

```json
{
  "result": "Enabled 2FA for user"
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
  "result": "Invalid 2FA code"
}
```

- `401`

```json
{
  "result": "Failed to authenticate"
}
```

- `500`

```json
{
  "result": "Error during verification"
}
```

## Behavior/Processing

- Validates code format first (`6` digits).
- Verifies TOTP with `otplib`.
- Stores encrypted secret and sets `two_factor_auth.enabled=true`.
- Emits system log action: `two_factor_auth_enabled`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | User account settings | Updates `two_factor_auth.enabled` and encrypted `two_factor_auth.secret_token`. |
| `countly.systemlogs` | Audit trail | Receives `two_factor_auth_enabled` action. |

---

## Examples

### Enable 2FA

```plaintext
/i/two-factor-auth?api_key=YOUR_API_KEY&method=enable&secret_token=JBSWY3DPEHPK3PXP&auth_code=123456
```

## Related Endpoints

- [Two Factor Auth - Disable](i-two-factor-auth-disable.md)
- [Two Factor Auth - Admin Check](i-two-factor-auth-admin-check.md)

## Last Updated

2026-03-05
