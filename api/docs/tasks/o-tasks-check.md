---
sidebar_label: "Check Task Status"
---

# /o/tasks/check

## Endpoint

```plaintext
/o/tasks/check
```

## Overview

Returns current status for one task ID or multiple task IDs.

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
| `task_id` | String | Yes | Single task ID, or JSON string array of task IDs. |

## Parameter Semantics

- If `task_id` parses as JSON array, endpoint returns multi-task status payload.
- If parsing fails, endpoint treats `task_id` as a single ID string.

## Response

### Success Response

Single task mode:

```json
{
  "result": "completed"
}
```

Multi-task mode:

```json
{
  "result": [
    {"_id": "task_1", "result": "completed"},
    {"_id": "task_2", "result": "running"},
    {"_id": "task_3", "result": "deleted"}
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String or Array | Status string for single-task mode, or status array for multi-task mode. |
| `result[] ._id` | String | Task ID in multi-task response. |
| `result[] .result` | String | Task status value (`running`, `completed`, `errored`, `deleted`, etc.). |
| `result[] .report_name` | String | Report name when present in task metadata (multi-task mode). |
| `result[] .type` | String | Task type when present (multi-task mode). |
| `result[] .manually_create` | Boolean | Manual task creation flag when present (multi-task mode). |
| `result[] .view` | String | Task view link when present (multi-task mode). |

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
| Single-task mode | `task_id` is a single string | Reads one task status and returns wrapped status string. | Wrapped string `{ "result": "status_value" }` |
| Multi-task mode | `task_id` parses as JSON array | Returns one status row per requested ID; missing IDs are marked as `deleted`. | Wrapped array `{ "result": [{...}] }` |
| Missing-task mode | Single-task lookup returns no task | Returns task-not-found error branch. | Wrapped string `{ "result": "Task does not exist" }` |

### Impact on Other Data

- Read-only endpoint.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and visibility scoping | Reads caller identity used by read validation and status visibility checks. |
| `countly.long_tasks` | Task status source | Reads status for one or multiple tasks. |

---

## Examples

### Example 1: Single task status

```plaintext
/o/tasks/check?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  task_id=17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5
```

### Example 2: Multiple task statuses

```plaintext
/o/tasks/check?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  task_id=["task_1","task_2","task_3"]
```

## Operational Considerations

- Suitable for polling status changes while async tasks are running.

---

## Related Endpoints

- [Tasks - Read Task](./o-tasks-task.md)
- [Tasks - List Tasks](./o-tasks-list.md)

## Last Updated

2026-02-17
