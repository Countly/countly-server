---
sidebar_label: "Group Update"
---

# /i/event_groups/update

## Endpoint

```plaintext
/i/event_groups/update
```

## Overview

Updates event groups through one of three branches: full update (`args`), reorder (`event_order`), or status change (`update_status` + `status`).

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires `Update` permission on feature `core` for `app_id`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | Target app ID for update permission check and filtering. |
| `args` | JSON String (Object) | No | Full group object update branch; payload must include `_id`. |
| `event_order` | JSON String (Array) | No | Reorder branch: array of group IDs in desired order. |
| `update_status` | JSON String (Array) | No | Bulk status update branch: array of group IDs. |
| `status` | JSON String (Boolean) | No | Used with `update_status`; expected values are `true` or `false`. |

## Parameter Semantics

| Field | Expected values | Behavior |
|---|---|---|
| `args` | JSON object | Branch 1: updates one event group using `_id` + `app_id`. |
| `event_order` | JSON array of group IDs | Branch 2: rewrites each group's `order` index by list position. |
| `update_status` + `status` | JSON array + JSON boolean | Branch 3: toggles `status` for listed groups; when `status=false`, group keys are removed from `events.overview`. |
| Branch precedence | `args` first, then `event_order`, then `update_status` | If multiple branch params are sent, only the first matching branch is executed. |

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
| `result` | String | Operation status message. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Error: args not found"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Could not find event"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

**Status Code**: `401 Unauthorized`
```json
{
  "result": "No app_id provided"
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "error: duplicate key error collection: event_groups index: _id_ dup key"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Full object update | `args` is provided | Parses `args`, then updates one group by `_id` with `$set`. | Wrapped string: `{ "result": "Success" }` |
| Reorder update | `event_order` is provided (and `args` is not) | Parses array and bulk-updates `order` for each listed group. | Wrapped string: `{ "result": "Success" }` |
| Bulk status update | `update_status` is provided (and previous branches not used) | Parses IDs and `status`, updates status for listed groups. | Wrapped string: `{ "result": "Success" }` |
| Disable-status cleanup | `update_status` branch with `status=false` | After status update, removes matching keys from `events.overview`. | Wrapped string: `{ "result": "Success" }` |

### Impact on Other Data

- Status disable flow mutates `countly.events.overview` by removing disabled group keys.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level update permissions. |
| `countly.event_groups` | Group definition updates | Updates group payload, order, or status by group IDs provided in request payload. |
| `countly.events` | Event overview cleanup | Reads and updates `overview` when disabling group status. |

## Examples

### Example 1: Update one group object

```plaintext
/i/event_groups/update?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&args={"_id":"[CLY]_group_dfc09a75fff37cd46fa09d7c88ab77bb","name":"Playback Group Updated","description":"Edited description"}
```

### Example 2: Reorder groups

```plaintext
/i/event_groups/update?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&event_order=["[CLY]_group_id_1","[CLY]_group_id_2"]
```

### Example 3: Disable multiple groups

```plaintext
/i/event_groups/update?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&update_status=["[CLY]_group_id_1","[CLY]_group_id_2"]&status=false
```

## Limitations

- JSON payload parameters are parsed directly with `JSON.parse` in endpoint logic.
- Sending multiple branch parameters in one request uses only the first branch in this order: `args` -> `event_order` -> `update_status`.

---

## Related Endpoints

- [Event Groups - Group Create](i-event-groups-create.md)
- [Event Groups - Group Delete](i-event-groups-delete.md)

## Last Updated

2026-02-17
