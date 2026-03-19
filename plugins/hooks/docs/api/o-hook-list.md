---
sidebar_label: "Hooks Read"
---

# Hooks - Read List

## Endpoint

```text
/o/hook/list
```

## Overview

Returns hook rules visible to the authenticated user, enriched with creator display name.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `hooks` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | String | No | Hook ID. If provided, filters result to that hook ID. |
| `app_id` | String | Conditional | Required for non-global-admin users. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Parameter Semantics

- `id` must be a valid MongoDB ObjectID string when provided.
- Global admins can call without `app_id`; non-global-admin users must provide `app_id` and have read access.

## Response

### Success Response

Standard success shape:

```json
{
  "hooksList": [
    {
      "_id": "65f0cbf8bca6b8e8fbf7f901",
      "name": "Notify Premium Cohort",
      "description": "Send alert when premium users enter cohort",
      "apps": ["6991c75b024cb89cdc04efd2"],
      "trigger": {
        "type": "InternalEventTrigger",
        "configuration": {
          "eventType": "/cohort/enter"
        }
      },
      "effects": [
        {
          "type": "EmailEffect",
          "configuration": {
            "address": ["ops@example.com"],
            "emailTemplate": "User {{uid}} entered premium cohort"
          }
        }
      ],
      "enabled": true,
      "createdBy": "65d4a6d4d8d9a17e2f5b1001",
      "createdByUser": "System Admin",
      "created_at": 1700000000000
    }
  ]
}
```

Degraded success branch used when internal list/member lookup query fails:

```json
[]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `hooksList` | Array | Hook list payload when list/member lookups succeed. |
| `hooksList[].createdByUser` | String | Creator full name resolved from members collection. |
| `(root)` | Array | Empty array branch used on internal query failure paths. |

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
  "result": "No app_id provided"
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
  "result": "App does not exist"
}
```

- `401`

```json
{
  "result": "Token is invalid"
}
```

- `500`

```json
{
  "result": "Failed to get hook listMongoServerError: query timeout"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Condition | Result |
|---|---|---|
| List all visible hooks | `id` not provided | Returns `hooksList` sorted by `created_at` descending. |
| Read one hook | `id` provided | Returns `hooksList` with 0 or 1 matched hook. |
| Internal query failure fallback | Hook or member query callback returns error | Returns raw empty array `[]`. |

### Impact on Other Data

This endpoint is read-only and does not modify hook documents.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Auth validation and creator name lookup | Reads user auth/permissions and creator profile names. |
| `countly.apps` | App access validation for non-global-admin calls | Reads app by `app_id` during read validation. |
| `countly.hooks` | Hook rule retrieval | Reads hook documents and returns matched list. |

---

## Examples

### Read all visible hooks

```text
/o/hook/list?app_id=6991c75b024cb89cdc04efd2&api_key=YOUR_API_KEY
```

### Read one hook by ID

```text
/o/hook/list?app_id=6991c75b024cb89cdc04efd2&api_key=YOUR_API_KEY&id=65f0cbf8bca6b8e8fbf7f901
```

## Limitations

- On internal hook/member query callback errors, endpoint returns `[]` instead of a structured error payload.
- `id` must be a valid ObjectID string; invalid values can trigger the `500` catch branch.

## Related Endpoints

- [Hooks - Save](i-hook-save.md)
- [Hooks - Update Status](i-hook-status.md)
- [Hooks - Delete](i-hook-delete.md)

## Last Updated

2026-02-17
