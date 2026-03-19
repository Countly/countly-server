---
sidebar_label: "User History"
---

# /o/push/user

## Endpoint

```plaintext
/o/push/user
```

Ⓔ Enterprise Only

## Overview

Returns push notification history for a single user, identified by user ID (`id`) or device ID (`did`).

---

## Authentication

This endpoint requires authentication and uses `read-permission validation`.

Supported authentication methods:
- Query parameter: `api_key`
- Query parameter: `auth_token`
- Header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `Read` permission for Push Notifications.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes* | API key authentication |
| `auth_token` | String | Yes* | Session token authentication |
| `app_id` | String | Yes | App ID |
| `messages` | BooleanString | Yes | `true` to include full message documents |
| `id` | String | Conditional | User `uid`; required if `did` is not provided |
| `did` | String | Conditional | Device ID; required if `id` is not provided |

`*` Provide either `api_key` or `auth_token`.

## Response

### Success Response

`messages=false`

```json
{
  "notifications": {
    "67cab1234d1e2a001f3b4567": [1709856000000, 1709942400000],
    "67cab1234d1e2a001f3b4568": [1709942400000]
  }
}
```

`messages=true`

```json
{
  "notifications": {
    "67cab1234d1e2a001f3b4567": [1709856000000, 1709942400000]
  },
  "messages": [
    {
      "_id": "67cab1234d1e2a001f3b4567",
      "status": "sent",
      "platforms": ["i", "a"],
      "info": {"title": "Welcome campaign"}
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `notifications` | Object | Map of `messageId -> delivery timestamps/details` from `push_{appId}.msgs` |
| `messages` | Array of objects | Included only when `messages=true`; matching docs from `countly.messages` |

### Error Responses

`400 Bad Request`

```json
{
  "result": {
    "errors": ["One of id & did parameters is required"]
  }
}
```

`404 Not Found`

```json
{
  "result": {
    "errors": ["User with the did specified is not found"]
  }
}
```

---

## Behavior/Processing

1. Validates `app_id`, `messages`, and optional `id`/`did`.
2. If only `did` is provided, resolves user by `countly.app_users{appId}.did` and reads `uid`.
3. Reads user push history from `countly.push_{appId}` using `_id = uid`.
4. Returns `{}` when user has no push history document or no `msgs` keys.
5. If `messages=true`, fetches matching message documents from `countly.messages`.

### Impact on Other Data

This endpoint is read-only and does not modify data.

## Database Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| `countly.app_users{appId}` | Resolves `uid` from `did` when needed | `did`, `uid` |
| `countly.push_{appId}` | Stores per-user push history (`msgs`) | `_id` (uid), `msgs` |
| `countly.messages` | Source of full message objects (optional branch) | `_id`, `status`, `platforms`, `info` |

---

## Examples

### Read user history by user ID

```plaintext
https://your-server.com/o/push/user
  ?api_key=YOUR_API_KEY
  &app_id=6991c75b024cb89cdc04efd2
  &id=user_123
  &messages=false
```

### Read user history by device ID with full message objects

```plaintext
https://your-server.com/o/push/user
  ?api_key=YOUR_API_KEY
  &app_id=6991c75b024cb89cdc04efd2
  &did=device_abc_001
  &messages=true
```

## Limitations

- Requires either `id` or `did`; sending both is allowed but `id` is used directly.
- Response may be empty (`{}`) when user exists but has no push history record.

---

## Related Endpoints

- [Push Notifications - Message List](./message-all.md)
- [Push Notifications - Message Get](./message-get.md)
- [Push Notifications - Dashboard](./dashboard.md)

---

## Last Updated

2026-03-07
