---
sidebar_label: "Dashboard User Delete"
---

# Users Management - User Delete

## Endpoint

```plaintext
/i/users/delete
```

## Overview

Deletes one or more dashboard users.

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
| `args` | JSON String (Object) | Yes | Deletion payload. |

### `args` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `user_ids` | Array of String | Yes | Dashboard user ids to delete. |

## Response

### Success Response

```json
{
  "result": "Success"
}
```

### Additional Success Response (Partial)

```json
{
  "result": "Some users cannot be deleted, please see logs for more detail"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Deletion status (`Success` or partial-success warning). |

### Error Responses

**Status Code**: `400 Bad Request`

```json
{
  "result": "Error: Validation error details"
}
```

**Status Code**: `500 Internal Server Error`

```json
{
  "result": "User deletion failed, please see logs for more detail"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Full success | All eligible users deleted | Deletes users and related records for each ID. | Wrapped `Success`. |
| Partial success | Some IDs fail deletion hook checks | Deletes eligible users, skips rejected ones. | Wrapped partial-success message. |
| Full failure | All requested IDs fail | No user deleted. | Wrapped 500 message. |

### Impact on Other Data

- Deletes user auth tokens, user-owned notes, and user-owned date presets for successfully deleted users.
- Deletion hooks from installed modules can remove additional user-linked data.

## Audit & System Logs

| Action | Trigger |
|---|---|
| `user_deleted` | Per-user successful deletion flow (when System Logs module is enabled). |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Primary user storage. | Reads target users and removes user records. |
| `countly.auth_tokens` | Token lifecycle. | Removes all tokens owned by deleted users. |
| `countly.notes` | User-linked notes cleanup. | Removes notes owned by deleted users. |
| `countly.date_presets` | User-linked presets cleanup. | Removes presets owned by deleted users. |

---

## Examples

### Example 1: Delete two users

```plaintext
/i/users/delete?api_key=YOUR_API_KEY&args={"user_ids":["67b3055b87d9f49e2f5f3201","67b305de87d9f49e2f5f3202"]}
```

---

## Limitations

- Global-admin-only endpoint.
- Current user id in `user_ids` is skipped (self-deletion is blocked here).
- Hook rejections from installed modules can prevent deletion of specific users.

## Related Endpoints

- [Own Account Delete](i-users-delete-own-account.md)
- [Users List](o-users-all.md)

## Last Updated

2026-02-17
