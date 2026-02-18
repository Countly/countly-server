---
sidebar_label: "Time Ban Reset"
---

# Users Management - Time Ban Reset

## Endpoint

```plaintext
/o/users/reset_timeban
```

## Overview

Resets failed-login time-ban state for one username.

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
| `username` | String | Yes | Username whose failed-login ban record should be removed. |

## Response

### Success Response

```json
true
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Boolean | `true` when removal succeeds. |

### Error Responses

**Status Code**: `500 Internal Server Error`

```json
{
  "result": "Remove from collection failed."
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Reset success | Delete query executes without DB error | Raw boolean `true`. |
| Reset failure | DB remove operation errors | Wrapped error message. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.failed_logins` | Failed-login lock source. | Removes one lock counter record by username-based key. |

---

## Examples

### Example 1: Reset lock for user

```plaintext
/o/users/reset_timeban?api_key=YOUR_API_KEY&username=jane
```

```json
true
```

---

## Limitations

- Endpoint targets `username`, not user id.

## Related Endpoints

- [Users List](o-users-all.md)

## Last Updated

2026-02-17
