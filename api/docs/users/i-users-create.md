---
sidebar_label: "User Create"
---

# Users Management - User Create

## Endpoint

```plaintext
/i/users/create
```

## Overview

Creates a new dashboard user account.

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
| `args` | JSON String (Object) | Yes | New user payload. |

### `args` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `full_name` | String | Yes | Display name. |
| `username` | String | Yes | Username (trimmed before save). |
| `password` | String | Yes | Plain password, validated against security password policy, then hashed before save. |
| `email` | String | Yes | Email (trimmed + lowercased before save). |
| `lang` | String | No | Language code. |
| `permission` | Object | No | Full permission object. |
| `admin_of` | Array | No | Backward-compatible app-admin shorthand. |
| `user_of` | Array | No | Backward-compatible app-user shorthand. |
| `global_admin` | Boolean | No | Global admin flag for new user. |

Example `args` value:

```json
{
  "full_name": "Jane Manager",
  "username": "jane",
  "password": "StrongPass123!",
  "email": "jane@example.com",
  "global_admin": false
}
```

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
  "_id": "67b3055b87d9f49e2f5f3201",
  "full_name": "Jane Manager",
  "username": "jane",
  "email": "jane@example.com",
  "permission": {
    "c": {},
    "r": {},
    "u": {},
    "d": {},
    "_": {
      "a": [],
      "u": []
    }
  },
  "global_admin": false,
  "password_changed": 0,
  "created_at": 1739795210,
  "locked": false,
  "api_key": "generated_api_key"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `_id` | String | Created dashboard user id. |
| `full_name` | String | Saved user full name. |
| `username` | String | Saved username. |
| `email` | String | Saved lowercased email. |
| `permission` | Object | Stored permissions after compatibility expansion. |
| `global_admin` | Boolean | Global admin flag. |
| `password_changed` | Number | Initialized as `0`. |
| `created_at` | Number | Creation timestamp (Unix seconds). |
| `locked` | Boolean | Initial lock state. |
| `api_key` | String | Generated dashboard API key for new user. |

### Error Responses

**Status Code**: `400 Bad Request`

```json
{
  "result": [
    "Validation error details"
  ]
}
```

**Status Code**: `400 Bad Request`

```json
{
  "result": [
    "Email or username already exists"
  ]
}
```

**Status Code**: `400 Bad Request`

```json
{
  "result": [
    "Error creating user"
  ]
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Create user | Valid payload and unique username/email | Hash password, normalize fields, insert user, create invite/reset record. | Raw user object payload. |
| Validation/duplicate fail | Invalid payload or duplicate username/email | Reject before insert. | Wrapped error array. |

### Impact on Other Data

- Creates an invite/reset record for the new user in `countly.password_reset`.

## Audit & System Logs

| Action | Trigger |
|---|---|
| `user_created` | Successful user creation (when System Logs module is enabled). |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Primary user storage. | Checks duplicate email/username, inserts new user. |
| `countly.password_reset` | Invite/reset lifecycle. | Inserts initial invite/reset record for new user. |

---

## Examples

### Example 1: Create dashboard user

```plaintext
/i/users/create?api_key=YOUR_API_KEY&args={"full_name":"Jane Manager","username":"jane","password":"StrongPass123!","email":"jane@example.com"}
```

---

## Limitations

- Global-admin-only endpoint.
- `args` must be valid JSON string.

## Related Endpoints

- [User Update](i-users-update.md)
- [User Delete](i-users-delete.md)

## Last Updated

2026-02-17
