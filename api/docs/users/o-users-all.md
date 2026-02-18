---
sidebar_label: "Users List"
---

# Users Management - Users List

## Endpoint

```plaintext
/o/users/all
```

## Overview

Returns all dashboard users as an object map keyed by user id.

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

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `security.login_tries` | Server config | `blocked` calculation | Defines failed-login step used to trigger blocked status. |
| `security.login_wait` | Server config | `blocked` calculation | Defines block duration window in seconds. |

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
    "blocked": false,
    "is_current_user": false
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | User map keyed by dashboard user id. |
| `user._id` | String | Dashboard user id. |
| `user.full_name` | String | Full name. |
| `user.username` | String | Username. |
| `user.email` | String | Email address. |
| `user.permission` | Object | User permission object. |
| `user.global_admin` | Boolean | Global admin flag. |
| `user.locked` | Boolean | Manual lock flag. |
| `user.created_at` | Number | Account creation timestamp (seconds). |
| `user.last_login` | Number | Last login timestamp (seconds), `0` if missing. |
| `user.blocked` | Boolean | Derived temporary block status from failed-login records. |
| `user.is_current_user` | Boolean | Present in response; current implementation typically returns `false` for all rows. |

### Error Responses

**Status Code**: `200 OK`

```json
{}
```

Returned when internal member or failed-login queries fail in this handler.

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Normal list | Member and failed-login queries succeed | User map object keyed by `_id`. |
| Query fallback | Member or failed-login query fails | Empty object `{}`. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | User source data. | Reads all dashboard users (excluding sensitive fields). |
| `countly.failed_logins` | Block-state source data. | Reads failed-login counters and timestamps for `blocked` calculation. |

---

## Examples

### Example 1: List dashboard users

```plaintext
/o/users/all?api_key=YOUR_API_KEY
```

---

## Limitations

- Global-admin-only endpoint.
- Response is an object map, not an array.
- `is_current_user` is currently not reliable for identifying caller row in this endpoint.

## Related Endpoints

- [User Read By ID](o-users-id.md)
- [Current User Read](o-users-me.md)
- [Time Ban Reset](o-users-reset-timeban.md)

## Last Updated

2026-02-17
