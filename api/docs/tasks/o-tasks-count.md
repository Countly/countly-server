---
sidebar_label: "Count Tasks"
---

# /o/tasks/count

## Endpoint

```plaintext
/o/tasks/count
```

## Overview

Returns grouped task counts for tasks visible to current user.

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
| `query` | JSON String (Object) or Object | No | Additional task filter object. |
| `period` | String | No | Time range filter converted to task `ts` query. |

## Parameter Semantics

- Visibility filter is always enforced: global tasks or tasks created by current member.
- `query` parsing failures fall back to `{}`.
- Unlike `/o/tasks/all` and `/o/tasks/list`, this endpoint does not add a `subtask` exclusion filter by default.

## Response

### Success Response

```json
[
  {
    "_id": "6991c75b024cb89cdc04efd2",
    "c": 14
  },
  {
    "_id": "6991c75b024cb89cdc04efaa",
    "c": 3
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Count rows grouped by `app_id`. |
| `[] ._id` | String | App ID grouping key. |
| `[] .c` | Number | Task count for that app group. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{"result":"Missing parameter \"api_key\" or \"auth_token\""}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Default count mode | Default call with or without `query` | Applies visibility filter (`global` or creator-owned), aggregates counts grouped by `app_id`. | Raw array of `{ _id, c }` rows |
| Period mode | `period` is provided | Adds `ts` range filter before count aggregation. | Raw array of `{ _id, c }` rows |
| Subtask-included mode | `query` does not explicitly filter `subtask` | Subtasks can be included in group counts. | Raw array of `{ _id, c }` rows |

### Impact on Other Data

- Read-only endpoint.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and visibility scoping | Reads caller identity used by read validation and creator visibility filtering. |
| `countly.long_tasks` | Task count source | Aggregates visible tasks grouped by app ID. |

---

## Examples

### Example 1: Count visible tasks

```plaintext
/o/tasks/count?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2
```

### Example 2: Count tasks for last 30 days

```plaintext
/o/tasks/count?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=30days
```

---

## Related Endpoints

- [Tasks - Read All Tasks](./o-tasks-all.md)
- [Tasks - List Tasks](./o-tasks-list.md)

## Limitations

- Counts may include subtasks unless caller explicitly filters them out in `query`.

## Last Updated

2026-02-17
