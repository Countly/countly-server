---
sidebar_label: "Current User Read"
---

# Users Management - Current User Read

## Endpoint

```plaintext
/o/users/me
```

## Overview

Returns the currently authenticated dashboard user object.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Any authenticated dashboard user.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |

## Response

### Success Response

```json
{
  "_id": "67b3055b87d9f49e2f5f3201",
  "full_name": "Global Admin",
  "username": "admin",
  "email": "admin@example.com",
  "global_admin": true,
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
  "api_key": "current_user_api_key"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `_id` | String | Current dashboard user id. |
| `full_name` | String | Full name. |
| `username` | String | Username. |
| `email` | String | Email address. |
| `global_admin` | Boolean | Global admin flag. |
| `permission` | Object | Permission object. |
| `api_key` | String | API key value in user object. |
| `password` | Not returned | Password is removed before response. |

### Error Responses

Authentication and authorization failures are returned by the common auth layer.

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Current user response | Authenticated request | Raw member object without `password`. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication source data. | Read during auth; handler returns authenticated member from request context. |

---

## Examples

### Example 1: Read current user

```plaintext
/o/users/me?api_key=YOUR_API_KEY
```

---

## Limitations

- Response may include additional member fields injected by installed modules.

## Related Endpoints

- [Users List](o-users-all.md)
- [User Read By ID](o-users-id.md)

## Last Updated

2026-02-17
