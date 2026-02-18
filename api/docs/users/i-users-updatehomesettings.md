---
sidebar_label: "Home Settings Update"
---

# Users Management - Home Settings Update

## Endpoint

```plaintext
/i/users/updateHomeSettings
```

## Overview

Updates home dashboard settings for the authenticated user under one app-specific key.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Global admin required by current route behavior.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | App id used as the dynamic key inside `homeSettings` (for example `homeSettings.6991c75b024cb89cdc04efd2`). |
| `homeSettings` | JSON String (Object) | Yes | Stringified object of home-page preferences. |

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
  "result": "Could not get member"
}
```

**Status Code**: `400 Bad Request`

```json
{
  "result": "`homeSettings` should contain stringified object with home settings"
}
```

**Status Code**: `400 Bad Request`

```json
{
  "result": "`app_id` must be passed"
}
```

**Status Code**: `400 Bad Request`

```json
{
  "result": "Mongo error"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Parsed settings update | `homeSettings` parses as JSON | Stores parsed object under `homeSettings.{app_id}` key. | Wrapped success message. |
| Parse fallback update | `homeSettings` parse fails | Stores `{}` under `homeSettings.{app_id}` key. | Wrapped success message. |
| Validation/DB failure | Missing params/member or DB write error | Aborts update. | Wrapped error message. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | User profile/home settings storage. | Updates `homeSettings.{app_id}` for authenticated member. |

---

## Examples

### Example 1: Save home settings

```plaintext
/i/users/updateHomeSettings?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&homeSettings={"widgets":["sessions","users"]}
```

---

## Limitations

- Current route requires global-admin-level validation.
- Invalid `homeSettings` JSON is silently replaced with `{}`.

## Related Endpoints

- [Current User Read](o-users-me.md)
- [User Update](i-users-update.md)

## Last Updated

2026-02-17
