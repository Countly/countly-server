---
sidebar_label: "Name Task"
---

# /i/tasks/name

## Endpoint

```plaintext
/i/tasks/name
```

## Overview

Updates the display name of an existing task.

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
| `task_id` | String | Yes | Task ID to rename. |
| `name` | String | No | New task display name. |

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
| `result` | String | `"Success"` after update callback. |

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
| Rename mode | `task_id` exists | Updates `name` field on matching task document. | Wrapped string `{ "result": "Success" }` |
| No-match mode | `task_id` does not exist | Update callback still resolves through success path in route handler. | Wrapped string `{ "result": "Success" }` |

### Impact on Other Data

- Updates task metadata only.

## Audit & System Logs

- No direct `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level write permissions. |
| `countly.long_tasks` | Task metadata storage | Updates `name` field on matching task. |

---

## Examples

### Example 1: Rename task

```plaintext
/i/tasks/name?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  task_id=17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5&
  name=Monthly Revenue Export
```

## Limitations

- Endpoint does not validate name content/uniqueness; caller should provide meaningful names.
- Endpoint returns success even when no task document is matched by `task_id`.

---

## Related Endpoints

- [Tasks - Edit Task](./i-tasks-edit.md)
- [Tasks - Read Task](./o-tasks-task.md)

## Last Updated

2026-02-17
