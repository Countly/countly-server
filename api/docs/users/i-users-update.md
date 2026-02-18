---
sidebar_label: "User Update"
---

# Users Management - User Update

## Endpoint

```plaintext
/i/users/update
```

## Overview

Updates an existing dashboard user.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Global admin required.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `args` | JSON String (Object) | Yes | Update payload. |

### `args` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | String | Yes | Target dashboard user id. |
| `full_name` | String | No | Updated full name. |
| `username` | String | No | Updated username (trimmed). |
| `password` | String | No | New password (validated and hashed). |
| `email` | String | No | Updated email (trimmed + lowercased). |
| `lang` | String | No | Language code. |
| `global_admin` | Boolean | No | Updated global admin flag. |
| `locked` | Boolean | No | Updated lock state. |
| `permission` | Object | No | Updated permission object. |
| `send_notification` | Boolean | No | Sends notification when password is changed. |
| `subscribe_newsletter` | Boolean | No | Newsletter subscription flag. |
| `admin_of` | Array | No | Backward-compatible app-admin shorthand. |
| `user_of` | Array | No | Backward-compatible app-user shorthand. |
| `member_image` | String | No | Set to `delete` to clear image reference. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `security.password_min` | Server config | Password validation | Enforces minimum password length. |
| `security.password_number` | Server config | Password validation | Requires number characters when enabled. |
| `security.password_char` | Server config | Password validation | Requires uppercase characters when enabled. |
| `security.password_symbol` | Server config | Password validation | Requires symbol characters when enabled. |

## Response

### Success Response

```json
{
  "result": "Success"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Update status message. |

### Error Responses

**Status Code**: `400 Bad Request`

```json
{
  "result": [
    "Validation error details"
  ]
}
```

**Status Code**: `500 Internal Server Error`

```json
{
  "result": "Error updating user. Please check api logs."
}
```

**Status Code**: `500 Internal Server Error`

```json
{
  "result": "Error updating user"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Standard update | Valid payload | Updates member fields and optional permissions. | Wrapped success message. |
| Password update | `args.password` provided | Hashes password; may reset target sessions and optionally send notification. | Wrapped success message. |
| Update failure | DB/update failure | Stops update flow. | Wrapped error message. |

### Impact on Other Data

- Removes password reset records for the user if email changes.
- Removes active sessions/auth tokens when password is changed by another user.

## Audit & System Logs

| Action | Trigger |
|---|---|
| `user_updated` | Successful user update (when System Logs module is enabled). |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Primary user storage. | Reads existing user, updates target user, reads updated user. |
| `countly.password_reset` | Reset/invite lifecycle. | Removes reset records when email changes. |
| `countly.sessions_` | Session lifecycle. | Removes user sessions when password changed by another user. |
| `countly.auth_tokens` | Token lifecycle. | Removes logged-in auth tokens when password changed by another user. |

---

## Examples

### Example 1: Update email

```plaintext
/i/users/update?api_key=YOUR_API_KEY&args={"user_id":"67b3055b87d9f49e2f5f3201","email":"new@example.com"}
```

### Example 2: Update password and notify

```plaintext
/i/users/update?api_key=YOUR_API_KEY&args={"user_id":"67b3055b87d9f49e2f5f3201","password":"NewStrongPass123!","send_notification":true}
```

---

## Limitations

- Global-admin-only endpoint.
- `args.user_id` is mandatory.

## Related Endpoints

- [User Create](i-users-create.md)
- [User Delete](i-users-delete.md)

## Last Updated

2026-02-17
