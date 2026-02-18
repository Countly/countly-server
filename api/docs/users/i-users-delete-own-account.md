---
sidebar_label: "Own Account Delete"
---

# Users Management - Own Account Delete

## Endpoint

```plaintext
/i/users/deleteOwnAccount
```

## Overview

Deletes the authenticated dashboard account after password verification.

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
| `password` | String | Yes | Current account password confirmation. |

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
| `result` | String | Deletion status message. |

### Error Responses

**Status Code**: `400 Bad Request`

```json
{
  "result": "password mandatory"
}
```

**Status Code**: `400 Bad Request`

```json
{
  "result": "password not valid"
}
```

**Status Code**: `400 Bad Request`

```json
{
  "result": "global admin limit"
}
```

**Status Code**: `500 Internal Server Error`

```json
{
  "result": {
    "errorMessage": "User deletion failed. Failed to delete some data related to this user."
  }
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Successful self-delete | Password valid and deletion hooks succeed | Deletes account and related records. | Wrapped `Success`. |
| Last global admin protection | User is last global admin | Stops deletion. | Wrapped `global admin limit`. |
| Hook failure | Any deletion hook rejects | Stops deletion completion. | Wrapped 500 object. |

### Impact on Other Data

- Deletes account record, active sessions, auth tokens, and user-owned date presets.
- Installed modules can add extra deletion checks/cleanup through delete hooks.

## Audit & System Logs

| Action | Trigger |
|---|---|
| `user_deleted` | Successful own-account deletion flow (when System Logs module is enabled). |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Primary user storage. | Reads user for password verification and removes account. |
| `countly.sessions_` | Session lifecycle. | Removes sessions matching deleted user id. |
| `countly.auth_tokens` | Token lifecycle. | Removes logged-in and owned tokens for deleted user. |
| `countly.date_presets` | User-linked presets cleanup. | Removes presets owned by deleted user. |

---

## Examples

### Example 1: Delete current account

```plaintext
/i/users/deleteOwnAccount?api_key=YOUR_API_KEY&password=CurrentPassword123!
```

---

## Limitations

- Current route requires global-admin-level validation.
- The final global admin account cannot be deleted.

## Related Endpoints

- [User Delete](i-users-delete.md)

## Last Updated

2026-02-17
