---
sidebar_label: "List Tasks"
---

# /o/tasks/list

## Endpoint

```plaintext
/o/tasks/list
```

## Overview

Returns paginated task list output in DataTables-compatible structure.

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
| `app_id` | String | Yes (for non-global users) | App context for read permission validation and data-source filtering. |
| `query` | JSON String (Object) or Object | No | Additional Mongo-style query object. |
| `data_source` | String | No | `all`, `independent`, or app-scoped mode. |
| `period` | String | No | Time range filter converted to `ts` query. |
| `iDisplayStart` | Number | No | Pagination offset. |
| `iDisplayLength` | Number | No | Pagination page size. |
| `iSortCol_0` | Number | No | Sort column index. |
| `sSortDir_0` | String | No | Sort direction (`asc` / `desc`). |
| `sSearch` | String | No | Keyword filter for task listing. |
| `sEcho` | String or Number | No | DataTables echo token returned as-is. |

## Parameter Semantics

- Visibility filter is always enforced:
  - if `query.creator` matches current user, creator-only filter is used
  - otherwise, global-or-creator visibility filter is applied
- Subtasks are excluded (`subtask` must not exist).
- `query` parsing failures fall back to `{}`.

## Response

### Success Response

```json
{
  "aaData": [
    {
      "_id": "17f0f6c3a2c42cbced96d4a01f88f9a7f45bc7a5",
      "report_name": "events-30days.csv",
      "status": "completed",
      "type": "tableExport",
      "end": 1771199042000,
      "start": 1771199023000
    }
  ],
  "iTotalDisplayRecords": 24,
  "iTotalRecords": 24,
  "sEcho": 1
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `aaData` | Array | Paginated task rows. |
| `iTotalDisplayRecords` | Number | Total rows matching applied query. |
| `iTotalRecords` | Number | Total rows reported for table (same as display count in current handler). |
| `sEcho` | String or Number | Echo value from request. |

### Error Responses

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "\"Query failed\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Paginated list mode | Query execution succeeds | Applies visibility, data-source, keyword, sort, and paging filters; returns DataTables payload. | Raw object `{ aaData, iTotalDisplayRecords, iTotalRecords, sEcho }` |
| Failure mode | Task table query fails | Returns query-failed error response. | Wrapped string `{ "result": "\"Query failed\"" }` |

### Impact on Other Data

- Read-only endpoint.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and visibility scoping | Reads caller identity used by read validation and creator visibility filtering. |
| `countly.long_tasks` | Task list source | Reads task records with paging/sorting/filtering. |
| `countly.widgets` | Dashboard widget linkage enrichment | Optional read to map linked report tasks to dashboard context. |
| `countly.dashboards` | Dashboard linkage enrichment | Optional read to map widget IDs to dashboard IDs. |

---

## Examples

### Example 1: First page

```plaintext
/o/tasks/list?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  iDisplayStart=0&
  iDisplayLength=10&
  sEcho=1
```

### Example 2: Sorted search

```plaintext
/o/tasks/list?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  iDisplayStart=0&
  iDisplayLength=20&
  iSortCol_0=7&
  sSortDir_0=desc&
  sSearch=export&
  sEcho=2
```

## Operational Considerations

- This endpoint is intended for paginated UI/table usage.
- Very broad filters can still be expensive due sorting/search over task history.

---

## Related Endpoints

- [Tasks - Read All Tasks](./o-tasks-all.md)
- [Tasks - Count Tasks](./o-tasks-count.md)
- [Tasks - Read Task](./o-tasks-task.md)

## Last Updated

2026-02-17
