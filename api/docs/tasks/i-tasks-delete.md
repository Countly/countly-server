---
sidebar_label: "Delete Task"
---

# /i/tasks/delete

## Endpoint

```plaintext
/i/tasks/delete
```

## Overview

Deletes a task record and associated stored results.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires write access to feature `core` for the target app.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | App ID used for write-permission validation. |
| `task_id` | String | Yes | Task ID to delete. |

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
| `result` | String | `"Success"` after delete flow callback. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"task_id\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Task found | `task_id` exists in `long_tasks` | Deletes task result data, removes task document, emits audit log. | Wrapped string `{ "result": "Success" }` |
| Task missing | `task_id` not found or delete returns error | Callback error is not surfaced by route handler; response still returns success. | Wrapped string `{ "result": "Success" }` |

### Impact on Other Data

- Removes task metadata and may delete GridFS task result file.
- Removes any additional task-type-specific result artifacts.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `task_manager_task_deleted` | After delete callback in route handler | Deleted task document when available (`undefined` when task is not found). |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level write permissions. |
| `countly.long_tasks` | Task metadata storage | Deletes task document(s). |
| `countly_fs.task_results` | Stored task output | Deletes GridFS result file when task uses GridFS storage. |

---

## Examples

### Example 1: Delete task

```plaintext
/i/tasks/delete?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  task_id=17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5
```

## Operational Considerations

- Delete is destructive and cannot be undone.
- If task has subtask links, related subtasks are also removed by task manager logic.

---

## Related Endpoints

- [Tasks - Read Task](./o-tasks-task.md)
- [Tasks - Check Task Status](./o-tasks-check.md)

## Last Updated

2026-02-17
