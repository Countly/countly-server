---
sidebar_label: "App User Delete"
---

# /i/app_users/delete

## Endpoint

```plaintext
/i/app_users/delete
```

## Overview

Delete app users by query and clean linked data.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires write-level app access.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | Target app ID. |
| `query` | JSON String (Object) | Yes | Query selecting users to delete. Must be non-empty. |
| `force` | Boolean/String | No | Required when query matches more than one user. |

## Response

### Success Response

```json
{
  "result": "User deleted"
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
  "result": "Missing parameter \"app_id\""
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"query\""
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Could not parse parameter \"query\": {bad-json}"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "No users matching criteria"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Parameter \"query\" cannot be empty, it would delete all users. Use clear app instead"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "This query would delete more than one user"
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

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Single-user delete | Query matches exactly one user | Collects affected user data, runs plugin cleanup, deletes user and related artifacts. | Wrapped string: `{ "result": "User deleted" }` |
| Multi-user delete | Query matches more than one user and `force` is provided | Executes same cleanup and deletion flow for all matched users. | Wrapped string: `{ "result": "User deleted" }` |
| Multi-user blocked | Query matches more than one user and `force` is missing | Request is rejected before delete. | Wrapped error string: `{ "result": "This query would delete more than one user" }` |
| Plugin cleanup failure | Any integrated feature cleanup fails | Core deletion is aborted and returns deletion-failed error. | Wrapped object: `{ "result": { "errorMessage": "..." } }` |

### Impact on Other Data

- Deletes granular drill events for removed users from `countly_drill.drill_events`.
- Removes export artifacts linked in `appUserExport` (including `countly.exports` export rows).
- Deletes user image files for removed users when picture links exist.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `app_user_deleted` | After successful app-user deletion flow | `{ app_id, query, uids }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level write permissions. |
| `countly.app_users{appId}` | Primary user deletion target | Reads matched users (including `uid`, `picture`, `appUserExport`) and removes matched user documents. |
| `countly_drill.drill_events` | Granular-event cleanup | Deletes granular event rows for removed user IDs. |
| `countly.exports` | Export payload cleanup | Deletes export rows tied to removed users' export artifacts. |
| `countly_fs` | Export archive cleanup | Removes app-user export archive objects when linked exports exist. |

---
## Examples

### Example 1: Delete single app user

```plaintext
/i/app_users/delete?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&query={"uid":"1"}
```

```json
{
  "result": "User deleted"
}
```

## Operational Considerations

- Multi-user deletion can be expensive because it runs plugin cleanup, granular-event cleanup, export cleanup, and file cleanup.
- Deletion may partially fail due to plugin cleanup dependencies; in that case the endpoint returns an error and logs details for operators.

## Limitations

- Empty queries are explicitly blocked.
- Multi-user delete requires explicit `force`.
- Deletion can fail when plugin-level cleanup fails for matched users.

---
## Related Endpoints

- [App Users - Update](i-app-users-update.md)
- [App Users - Export](i-app-users-export.md)

## Last Updated

2026-02-17
