---
sidebar_label: "Read All Tasks"
---

# /o/tasks/all

## Endpoint

```plaintext
/o/tasks/all
```

## Overview

Returns task records visible to current user, with optional query and period filtering.

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
| `app_id` | String | Yes (for non-global users) | Primary app filter for task query scope. |
| `query` | JSON String (Object) or Object | No | Additional Mongo-style filter object. |
| `app_ids` | String | No | Comma-separated app ID list. Applied only when list has more than one value. |
| `period` | String | No | Time range filter converted to task `ts` timestamp query. |

## Parameter Semantics

- Visibility filter is always enforced: global tasks or tasks created by current member.
- Subtasks are excluded (`subtask` must not exist).
- `query` parsing failures fall back to `{}`.

## Response

### Success Response

```json
[
  {
    "_id": "17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5",
    "status": "completed",
    "type": "tableExport",
    "app_id": "6991c75b024cb89cdc04efd2",
    "creator": "65a16f6b8e43c117c38d8f00",
    "report_name": "events-30days.csv",
    "ts": 1771199023000
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Visible task records matching filter. |
| `[] ._id` | String | Task ID. |
| `[] .status` | String | Task status (`running`, `completed`, `errored`, etc.). |
| `[] .type` | String | Task type label. |
| `[] .app_id` | String | Task app context. |
| `[] .creator` | String | Task creator member ID. |
| `[] .ts` | Number | Task timestamp. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{"result":"Missing parameter \"api_key\" or \"auth_token\""}
```

**Status Code**: `401 Unauthorized`
```json
{"result":"User does not have right"}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Base list mode | Default call with or without `query` | Applies visibility filter (`global` or creator-owned), excludes subtasks, returns matching tasks. | Raw array of task objects |
| Extended app filter mode | `app_ids` has more than one ID | Applies `$in` app filter override on top of visibility logic. | Raw array of task objects |
| Period-filter mode | `period` is provided | Adds `ts` range query based on period parsing. | Raw array of task objects |

### Impact on Other Data

- Read-only endpoint.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and visibility scoping | Reads caller identity used by read validation and creator visibility filtering. |
| `countly.long_tasks` | Task metadata source | Reads visible task records matching request filters. |

---

## Examples

### Example 1: Read tasks for one app

```plaintext
/o/tasks/all?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2
```

### Example 2: Read tasks for multiple apps

```plaintext
/o/tasks/all?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  app_ids=6991c75b024cb89cdc04efd2,6991c75b024cb89cdc04efaa
```

## Operational Considerations

- This endpoint can return large arrays; prefer paginated listing for UI tables.

---

## Related Endpoints

- [Tasks - List Tasks](./o-tasks-list.md)
- [Tasks - Count Tasks](./o-tasks-count.md)
- [Tasks - Read Task](./o-tasks-task.md)

## Last Updated

2026-02-17
