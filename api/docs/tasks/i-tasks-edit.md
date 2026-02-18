---
sidebar_label: "Edit Task"
---

# /i/tasks/edit

## Endpoint

```plaintext
/i/tasks/edit
```

## Overview

Updates editable task metadata such as report labels, visibility, and auto-refresh flags.

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
| `task_id` | String | Yes | Task ID to edit. |
| `report_name` | String | No | New report name. |
| `report_desc` | String | No | New report description. |
| `global` | Boolean or String | No | Visibility toggle. Parsed as string comparison to `"true"`. |
| `autoRefresh` | Boolean or String | No | Auto-refresh toggle. Parsed as string comparison to `"true"`. |
| `period_desc` | String | No | Period descriptor stored with task metadata. |

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
| `result` | String | `"Success"` when edit call completes without error. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"task_id\""
}
```

**Status Code**: `503 Service Unavailable`
```json
{
  "result": "Error"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Update mode | `task_id` exists and edit succeeds | Updates task metadata fields (`report_name`, `report_desc`, `global`, `autoRefresh`, `period_desc`). | Wrapped string `{ "result": "Success" }` |
| Error mode | Edit operation returns error | Returns `503` with generic error response. | Wrapped string `{ "result": "Error" }` |

### Impact on Other Data

- Updates task metadata only.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `task_manager_task_updated` | After edit callback (success or error branch) | `{ before, after }` task metadata snapshot from task manager edit result. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level write permissions. |
| `countly.long_tasks` | Task metadata storage | Updates report metadata, visibility, and refresh settings. |

---

## Examples

### Example 1: Update report metadata

```plaintext
/i/tasks/edit?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  task_id=17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5&
  report_name=Weekly KPI Export&
  report_desc=Updated weekly export metadata
```

### Example 2: Enable global auto-refresh settings

```plaintext
/i/tasks/edit?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  task_id=17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5&
  global=true&
  autoRefresh=true&
  period_desc=last7days
```

## Limitations

- Boolean-like fields are string-interpreted (`"true"` => true; anything else => false).

---

## Related Endpoints

- [Tasks - Name Task](./i-tasks-name.md)
- [Tasks - Read Task](./o-tasks-task.md)

## Last Updated

2026-02-17
