---
sidebar_label: "Export Request Query"
---

# /o/export/requestQuery

## Endpoint

```plaintext
/o/export/requestQuery
```

## Overview

Creates an asynchronous export task from a target API query and returns a task ID immediately.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires authenticated dashboard user access.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | No | Optional app ID attached to created export task metadata. |
| `path` | String | Yes | Target API path to query. |
| `method` | String | No | Optional method value forwarded to request pipeline. |
| `data` | JSON String (Object) | No | Request payload for target query. |
| `db` | String | No | Database context for export cursor resolution (for example `countly_drill`). |
| `type` | String | No | Export format (`json`, `csv`, `xls`, `xlsx`). |
| `filename` | String | No | Export base file name (extension is appended from `type`). |
| `type_name` | String | No | Task type label in task metadata (default: `tableExport`). |

## Parameter Semantics

- `path` is normalized to start with `/`.
- `data` parse failures fall back to `{}`.
- Task metadata stores report file name as `filename + "." + type`.

## Response

### Success Response

```json
{
  "result": {
    "task_id": "17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5"
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Object | Wrapped long-task creation payload. |
| `result.task_id` | String | ID of created export task. Use this ID to download task output later. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"path\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Valid request mode | `path` is provided and request validates | Creates long task immediately (`force` mode), returns wrapped `task_id`, continues export in background. | Wrapped object `{ "result": { "task_id": "..." } }` |
| Invalid request mode | Required params are missing (for example `path`) | Fails validation before task creation. | Wrapped string error (for example missing `path`) |

### Impact on Other Data

- Creates/updates task metadata and export result files.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint itself for normal task creation flow.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication validation | Reads caller identity for management-read access validation. |
| `countly.long_tasks` | Async export task state | Creates and updates export task records. |
| `countly_fs.task_results` | Async export output storage | Stores export result file content for later download. |

---

## Examples

### Example 1: Create async CSV export task

```plaintext
/o/export/requestQuery?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  path=/o/analytics/events&
  data={"app_id":"6991c75b024cb89cdc04efd2","period":"30days"}&
  type=csv&
  filename=events-30days
```

### Example 2: Create async drill export task

```plaintext
/o/export/requestQuery?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  db=countly_drill&
  path=/o/drill/query&
  data={"query":{"appID":"6991c75b024cb89cdc04efd2"}}&
  type=json&
  filename=drill-query
```

## Operational Considerations

- This endpoint is asynchronous by design.
- Use [Data Export - Download Export](./o-export-download.md) with the returned `task_id` to fetch final output.

## Limitations

- Returns only task creation response, not final export data.
- Final export availability depends on task completion and output size.

---

## Related Endpoints

- [Data Export - Download Export](./o-export-download.md)
- [Tasks - Task Status](../tasks/o-tasks-task.md)

## Last Updated

2026-02-17
