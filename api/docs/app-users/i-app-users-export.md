---
sidebar_label: "Export Create"
---

# /i/app_users/export

## Endpoint

```plaintext
/i/app_users/export
```

## Overview

Start or reuse an app-user export task.

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
| `query` | JSON String (Object) | Yes | Mongo-style query selecting users for export. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.request_threshold` | Server config value | Sync/async response switching | If export processing exceeds the threshold, the endpoint returns a task ID and completes in the background. |

## Response

### Success Response

Running task already exists for the same request:

```json
{
  "task_id": "66f0f6adf4a9b20012e45678"
}
```

New request switched to long-task mode:

```json
{
  "result": {
    "task_id": "03ccb0c8ac773298f62f8bdb5d0f8869cb78f788"
  }
}
```

Request finished in normal request window:

```json
{
  "result": "appUser_64b0ac10c2c3ce0012dd1001_1.json"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `task_id` | String | Returned as raw root only when a matching running export already exists. |
| `result.task_id` | String | Returned when a new export switches to long-task mode. |
| `result` | String | Export filename when request completes synchronously. |

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
  "result": "Query didn't mach any user"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": {
    "message": "Export failed while creating export files from DB. Unable to clean up file system.",
    "filename": "appUser_64b0ac10c2c3ce0012dd1001_HASH_3e5b86cb367a6b8c0689ffd80652d2bbcb0a3edf"
  }
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Reuse running export | Matching export task is already running | Returns existing task reference without starting another export. | Raw object: `{ "task_id": "..." }` |
| Synchronous completion | Export completes before `api.request_threshold` | Builds export payload and returns filename in current request. | Wrapped string: `{ "result": "appUser_...json" }` |
| Long-task execution | Export exceeds `api.request_threshold` | Creates long task and continues processing in background. | Wrapped object: `{ "result": { "task_id": "..." } }` |

### Impact on Other Data

- Writes export payload rows into `countly.exports`.
- For single-user exports, updates `countly.app_users{appId}` by setting `appUserExport`.
- Invokes feature integrations so additional feature data can be included in the same export package.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `export_app_user_started` | Export process starts for matched users | `{ result, uids, app_id, info, export_file }` |
| `export_app_user` | Export completes or fails | `{ result, uids, app_id, info, export_file }` (fields vary by success/error branch) |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level write permissions. |
| `countly.app_users{appId}` | Export source and metadata update | Reads matched user profiles; may set `appUserExport` for single-user export. |
| `countly.exports` | Export payload storage | Stores exported rows from app users and plugin-provided collections. |
| `countly.long_tasks` | Async task tracking | Stores long-task metadata/results when export runs asynchronously. |

---
## Examples

### Example 1: Start export task

```plaintext
/i/app_users/export?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&query={"uid":"1"}
```

```json
{
  "result": "appUser_64b0ac10c2c3ce0012dd1001_1.json"
}
```

### Example 2: Long-task response (threshold exceeded)

```json
{
  "result": {
    "task_id": "03ccb0c8ac773298f62f8bdb5d0f8869cb78f788"
  }
}
```

## Operational Considerations

- The endpoint can return either a final filename or a task reference depending on runtime duration.
- When long-task mode is triggered, use task APIs/UI to monitor completion and fetch final result.
- Large query scopes can trigger longer execution and background processing.

## Limitations

- Success payload shape is mode-dependent (`task_id` vs wrapped `result`).
- Export fails when the query does not match any users.

---
## Related Endpoints

- [App Users - Download Export](o-app-users-download.md)
- [App Users - Delete Export](i-app-users-deleteexport.md)

## Last Updated

2026-02-17