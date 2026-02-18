---
sidebar_label: "User Read By ID"
---

# Users Management - User Read By ID

## Endpoint

```plaintext
/o/users/id
```

## Overview

Returns one dashboard user as an object map keyed by the user id.

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
| `id` | String | Yes | Dashboard user id. |

## Response

### Success Response

```json
{
  "67b3055b87d9f49e2f5f3201": {
    "_id": "67b3055b87d9f49e2f5f3201",
    "full_name": "Global Admin",
    "username": "admin",
    "email": "admin@example.com",
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
    "global_admin": true,
    "locked": false,
    "created_at": 1739700000,
    "last_login": 1739780000,
    "is_current_user": false
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | User map keyed by requested user id. |
| `user._id` | String | Dashboard user id. |
| `user.full_name` | String | Full name. |
| `user.username` | String | Username. |
| `user.email` | String | Email address. |
| `user.permission` | Object | Permission object. |
| `user.global_admin` | Boolean | Global admin flag. |
| `user.locked` | Boolean | Manual lock flag. |
| `user.created_at` | Number | Account creation timestamp (seconds). |
| `user.last_login` | Number | Last login timestamp (seconds), `0` if missing. |
| `user.is_current_user` | Boolean | Present in response; current implementation typically returns `false`. |

### Error Responses

**Status Code**: `401 Unauthorized`

```json
{
  "result": "Missing user id parameter"
}
```

**Status Code**: `200 OK`

```json
{}
```

Returned when the target user does not exist or query fails.

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| User found | Valid `id` and member exists | User map object keyed by id. |
| Missing/unknown user | Missing `id` or member not found | `401` message (missing id) or `{}` (not found/query failure). |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | User source data. | Reads one dashboard user by `_id`. |

---

## Examples

### Example 1: Read user by id

```plaintext
/o/users/id?api_key=YOUR_API_KEY&id=67b3055b87d9f49e2f5f3201
```

---

## Limitations

- Global-admin-only endpoint.
- Not-found response is `{}` instead of `404`.
- `is_current_user` is currently not reliable in this endpoint response.

## Related Endpoints

- [Users List](o-users-all.md)
- [Current User Read](o-users-me.md)

## Last Updated

2026-02-17
