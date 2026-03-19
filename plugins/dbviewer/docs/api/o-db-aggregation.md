---
sidebar_label: "Aggregation Query"
---

# DB Viewer - Aggregation Query

## Endpoint

```plaintext
/o/db?db=countly&collection=members&aggregation=[{"$match":{}},{"$group":{"_id":"$role","count":{"$sum":1}}}]
```

## Overview

Executes a MongoDB aggregation pipeline for the selected collection.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires DB Viewer access (`dbviewer` read right for app-scoped users).

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `db` / `dbs` | String | Yes | MongoDB database name. |
| `collection` | String | Yes | Collection name. |
| `aggregation` | JSON String (Array) | Yes | Aggregation pipeline array. |
| `iDisplayLength` | Number | No | If set, endpoint appends `$limit` stage with this value. |
| `sEcho` | String | No | Echo value returned in result envelope. |
| `save_report` | Boolean/String | No | If truthy, forces long-task storage path. |
| `report_name` | String | No | Task/report display name. |
| `report_desc` | String | No | Task/report description. |
| `period_desc` | String | No | Task/report period description. |
| `global` | Boolean/String | No | Global visibility flag for saved task report. |
| `autoRefresh` | Boolean/String | No | Auto-refresh flag for task report. |
| `manually_create` | Boolean/String | No | Marks task as manually created. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.request_threshold` | Server-defined | Long-task threshold | Heavy aggregation requests switch to task mode and return `task_id` instead of immediate results. |

## Response

### Success Response (direct output)

```json
{
  "sEcho": "1",
  "iTotalRecords": 0,
  "iTotalDisplayRecords": 0,
  "aaData": [
    {"_id": "admin", "count": 12}
  ],
  "removed": {}
}
```

### Success Response (task mode)

```json
{
  "task_id": "65fca8f79f8a0f0012f3c112"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `task_id` | String | Present when request is queued or matched to existing running task. |
| `aaData` | Array | Aggregation results in direct output mode. |
| `removed` | Object | For restricted users, lists removed non-whitelisted pipeline stages. |
| `sEcho` | String | Echo value from request. |

### Error Responses

- `500`

```json
{
  "result": "Aggregation object is not valid."
}
```

- `500`

```json
{
  "result": "The aggregation pipeline must be of the type array"
}
```

- `401`

```json
{
  "result": "User does not have right tot view this colleciton"
}
```

## Behavior/Processing

- Parses `aggregation` as EJSON array.
- For non-admin users, pipeline stages are filtered through an allowlist and removed stages are returned in `removed`.
- For non-admin users querying `events_data`/`drill_events`, app-level base filter is prepended as `$match`.
- For `members`, sensitive fields are projected out in pipeline path.
- For `auth_tokens`, `_id` is redacted in pipeline path.
- Execution is managed through task manager; responses can be immediate output or `task_id` based on threshold/running task conditions.

## Database Collections

This endpoint reads from the selected MongoDB collection and may write task artifacts via task manager/GridFS when queued.

## Examples

### Run aggregation directly

```plaintext
/o/db?api_key=YOUR_API_KEY&db=countly&collection=members&aggregation=[{"$group":{"_id":"$global_admin","count":{"$sum":1}}}]
```

### Run and force task/report mode

```plaintext
/o/db?api_key=YOUR_API_KEY&db=countly&collection=members&aggregation=[{"$group":{"_id":"$role","count":{"$sum":1}}}]&save_report=true&report_name=RoleSummary
```

## Related Endpoints

- [DB Viewer - Collection Query](o-db-collection.md)
- [DB Viewer - Databases List](o-db.md)

## Last Updated

2026-03-07
