---
sidebar_label: "User Config Read"
---

# Features - User Config Read

## Endpoint

```text
/o/userconfigs
```

## Overview

Returns user-level configuration values for the authenticated dashboard user.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires an authenticated dashboard user.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Response

### Success Response

```json
{
  "frontend": {
    "session_timeout": 15
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | User-level configuration map. |
| `{namespace}` | Object | Namespace-level user configuration. |
| `{namespace}.{setting}` | Varies | Effective user-level setting value. |

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
  "result": "User is locked"
}
```

- `401`

```json
{
  "result": "Token is invalid"
}
```

- `401`

```json
{
  "result": "User does not have right"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Condition | Result |
|---|---|---|
| User config read | Authenticated user validation passes | Returns user-level config map from member settings context. |

### Impact on Other Data

This endpoint is read-only and does not modify data.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and user settings lookup | Reads authenticated user and uses `member.settings` to build user config response. |

---

## Examples

### Read current user config

```text
/o/userconfigs?api_key=YOUR_API_KEY
```

## Related Endpoints

- [Features - User Config Update](i-userconfigs.md)
- [Features - Global Config Read](o-configs.md)

## Last Updated

2026-02-17
