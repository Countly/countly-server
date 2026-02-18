---
sidebar_label: "Read Task"
---

# /o/tasks/task

## Endpoint

```plaintext
/o/tasks/task
```

## Overview

Returns a single task record (or selected subtask result flow) for the requested task ID.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires read access to feature `core`.
- `app_id` is required for non-global users by read validation rules.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes (for non-global users) | App context for read permission validation. |
| `task_id` | String | Yes | Task ID to read. |
| `subtask_key` | String | No | Optional subtask key used for task-group subtask retrieval flow. |

## Response

### Success Response

```json
{
  "_id": "17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5",
  "status": "completed",
  "type": "tableExport",
  "report_name": "events-30days.csv",
  "app_id": "6991c75b024cb89cdc04efd2",
  "creator": "65a16f6b8e43c117c38d8f00",
  "start": 1771199023000,
  "end": 1771199042000,
  "data": "[...]"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `_id` | String | Task ID. |
| `status` | String | Task status. |
| `type` | String | Task type label. |
| `report_name` | String | Export/report file name when present. |
| `app_id` | String | Task app context. |
| `creator` | String | Task creator member ID. |
| `start` | Number | Task start timestamp (ms). |
| `end` | Number | Task end timestamp (ms). |
| `data` | String or Object | Task result payload (format depends on task type and storage mode). |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"task_id\""
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Task does not exist"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Standard task mode | `task_id` provided without `subtask_key` | Reads task record by ID and returns task payload. | Raw task object |
| Subtask lookup mode | `subtask_key` is provided | Resolves matching subtask result from task-group flow when available. | Raw task/subtask object |
| Missing-task mode | Task lookup returns no result | Returns not-found error response. | Wrapped string `{ "result": "Task does not exist" }` |

### Impact on Other Data

- Read-only endpoint.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and visibility scoping | Reads caller identity used by read validation and task visibility checks. |
| `countly.long_tasks` | Task metadata/result source | Reads task records and status information. |
| `countly_fs.task_results` | GridFS-backed result data | Reads task result bytes when task uses GridFS storage. |

---

## Examples

### Example 1: Read task record

```plaintext
/o/tasks/task?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  task_id=17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5
```

### Example 2: Read subtask flow

```plaintext
/o/tasks/task?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  task_id=17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5&
  subtask_key=step-2
```

## Operational Considerations

- Returned payload can be large for heavy export/report tasks.
- Response structure varies by task type.

---

## Related Endpoints

- [Tasks - Check Task Status](./o-tasks-check.md)
- [Tasks - List Tasks](./o-tasks-list.md)

## Last Updated

2026-02-17
