---
sidebar_label: "Export Delete"
---

# /i/app_users/deleteExport/{id}

## Endpoint

```plaintext
/i/app_users/deleteExport/{id}
```

## Overview

Delete an existing app-user export artifact.

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
| `app_id` | String | Yes | Target app ID for permission validation. |
| `id` | String | Yes | Export file identifier from path segment. |

## Response

### Success Response

```json
{
  "result": "Export deleted"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Export deletion status. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "invalid filename"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid filename"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "There was some errors during deleting export. Please look in log for more information"
}
```

**Status Code**: `401 Unauthorized`
```json
{
  "result": "No app_id provided"
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
| Single-user export cleanup | `id` matches `appUser_{appId}_{uid}` | Deletes export artifacts and unsets `appUserExport` on matching user. | Wrapped string: `{ "result": "Export deleted" }` |
| Multi-user/hash export cleanup | `id` matches hash export format | Deletes export artifacts without user-profile field update. | Wrapped string: `{ "result": "Export deleted" }` |
| Invalid filename | `id` format does not match expected prefix | Request is rejected before cleanup. | Wrapped error string: `{ "result": "invalid filename" }` |

### Impact on Other Data

- Removes export payload records from `countly.exports`.
- For single-user exports, updates `countly.app_users{appId}` to remove stored `appUserExport` path.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `export_app_user_deleted` | Successful export deletion | `{ result, id, app_id, info }` (plus `uids` for single-user export IDs) |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level write permissions. |
| `countly.exports` | Export payload cleanup | Deletes records where `_eid` matches the export identifier. |
| `countly.app_users{appId}` | Single-user export metadata cleanup | Unsets `appUserExport` when the deleted export belongs to one user. |
| `countly_fs` | Export archive cleanup | Deletes archive objects from GridFS `appUsers` bucket when present. |

---
## Examples

### Example 1: Delete export

```plaintext
/i/app_users/deleteExport/appUser_64b0ac10c2c3ce0012dd1001_1?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001
```

```json
{
  "result": "Export deleted"
}
```

## Limitations

- `id` must follow expected export naming format.

---
## Related Endpoints

- [App Users - Export](i-app-users-export.md)
- [App Users - Download Export](o-app-users-download.md)

## Last Updated

2026-02-17