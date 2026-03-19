---
sidebar_label: "System Logs Metadata"
---

# System Logs - Metadata

## Endpoint

```plaintext
/o?method=systemlogs_meta
```

Ⓔ Enterprise Only

## Overview

Returns available system log metadata values (for example known action keys) and the user list used by filters.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires Global Admin access.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `systemlogs_meta`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |

## Response

### Success Response

```json
{
  "action": [
    "app_created",
    "app_updated",
    "user_created",
    "user_deleted"
  ],
  "users": [
    {
      "_id": "617f9c7e5b25eea3b9afabf8",
      "username": "admin",
      "email": "admin@company.com",
      "full_name": "Admin User"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `action` | Array | Known action keys collected in metadata document. |
| `users` | Array | Member list for filter UI. |
| `users[]._id` | String | Member id. |
| `users[].username` | String | Username value. |
| `users[].email` | String | Email value. |
| `users[].full_name` | String | Full name value. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

- `400`

```json
{
  "result": "Token not valid"
}
```

- `401`

```json
{
  "result": "User does not exist"
}
```

- `401`

```json
{
  "result": "User does not have right"
}
```

- `401`

```json
{
  "result": "User is locked"
}
```

- `401`

```json
{
  "result": "Token is invalid"
}
```

## Behavior/Processing

- Reads metadata from `countly.systemlogs` document `_id: "meta_v2"`.
- Decodes stored metadata keys before returning them.
- Always returns `users` array, even when no metadata is available.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.systemlogs` | Metadata source | Reads metadata document (`meta_v2`) with known action values. |
| `countly.members` | User filter source | Reads member list with `username`, `email`, and `full_name`. |

---

## Examples

### Read metadata for system logs filters

```plaintext
/o?method=systemlogs_meta&api_key=YOUR_API_KEY
```

## Limitations

- Metadata values depend on previously recorded actions; new actions appear only after first write.

---

## Related Endpoints

- [System Logs - Query](o-systemlogs-query.md)
- [System Logs - Record](i-systemlogs.md)

## Last Updated

2026-03-05
