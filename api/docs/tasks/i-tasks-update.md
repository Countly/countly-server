---
sidebar_label: "Update Task"
---

# /i/tasks/update

## Endpoint

```plaintext
/i/tasks/update
```

## Overview

Requests a rerun of an existing task by ID.

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
| `task_id` | String | Yes | Task ID to rerun. |

## Response

### Success Response

Rerun accepted:

```json
{
  "result": "Success"
}
```

Task cannot be rerun:

```json
{
  "result": "This task cannot be run again"
}
```

No runnable auth context:

```json
{
  "result": "No permission to run this task"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Rerun outcome message from task manager. |

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
| Rerun mode | Task has stored replayable request payload | Marks task as rerunning and replays request. | Wrapped string `{ "result": "Success" }` |
| Non-rerunnable mode | Task missing replayable request or task not found | Returns informational no-rerun message. | Wrapped string `{ "result": "This task cannot be run again" }` |
| Permission fallback mode | Replay request has no usable API key context | Returns permission message from rerun flow. | Wrapped string `{ "result": "No permission to run this task" }` |

### Impact on Other Data

- Updates task state and may produce new task result output.

## Audit & System Logs

- No direct `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Replay permission context resolution | Reads member/global-admin API key fallback when rerunning stored requests. |
| `countly.long_tasks` | Task status and request replay source | Reads task definition and updates run status. |
| `countly_fs.task_results` | Task output storage | May be updated when rerun completes with new result data. |

---

## Examples

### Example 1: Rerun task

```plaintext
/i/tasks/update?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  task_id=17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5
```

## Operational Considerations

- Rerun starts asynchronous processing; `result` message is immediate and not final completion status.

## Limitations

- Endpoint does not return final task output; check task endpoints for completion state and data.

---

## Related Endpoints

- [Tasks - Check Task Status](./o-tasks-check.md)
- [Tasks - Read Task](./o-tasks-task.md)
- [Tasks - Delete Task](./i-tasks-delete.md)

## Last Updated

2026-02-17
