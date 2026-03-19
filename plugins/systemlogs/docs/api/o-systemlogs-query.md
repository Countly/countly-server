---
sidebar_label: "System Logs Query"
---

# System Logs - Query

## Endpoint

```plaintext
/o?method=systemlogs
```

Ⓔ Enterprise Only

## Overview

Returns system log entries in DataTables-compatible format with support for filtering, search, pagination, sorting, and export flattening.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires Global Admin access.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `systemlogs`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `query` | String (JSON Object) | No | JSON filter applied to `countly.systemlogs`. Invalid JSON is ignored and treated as `{}`. |
| `sSearch` | String | No | Regex-style case-insensitive search applied to action field `a`. |
| `period` | String | No | Countly period value used to build `ts` range query. |
| `iDisplayStart` | Number | No | Pagination offset. |
| `iDisplayLength` | Number | No | Page size. Use `-1` to disable limit. |
| `iSortCol_0` | Number | No | Sort column index (`1: ts`, `2: u`, `3: ip`, `4: a`, `5: i`). |
| `sSortDir_0` | String | No | Sort direction (`asc` or `desc`). |
| `sEcho` | String | No | Echo identifier returned as-is. |
| `export` | Boolean/String | No | When truthy, flattens each log entry for export-friendly output. |

## Response

### Success Response

Standard mode:

```json
{
  "sEcho": "5",
  "iTotalRecords": 81270,
  "iTotalDisplayRecords": 390,
  "aaData": [
    {
      "_id": "6270ea3dbccff991b16ef7f0",
      "a": "app_updated",
      "i": {
        "app_id": "6991c75b024cb89cdc04efd2",
        "before": {
          "timezone": "UTC"
        },
        "after": {
          "timezone": "Europe/Istanbul"
        }
      },
      "ts": 1707484489,
      "cd": "2024-02-09T11:41:29.000Z",
      "u": "admin@company.com",
      "ip": "203.0.113.10",
      "app_id": "6991c75b024cb89cdc04efd2",
      "user_id": "617f9c7e5b25eea3b9afabf8"
    }
  ]
}
```

Export mode (`export=true`):

```json
{
  "sEcho": "5",
  "iTotalRecords": 81270,
  "iTotalDisplayRecords": 390,
  "aaData": [
    {
      "a": "app_updated",
      "ts": 1707484489,
      "u": "admin@company.com",
      "ip": "203.0.113.10",
      "app_id": "6991c75b024cb89cdc04efd2",
      "user_id": "617f9c7e5b25eea3b9afabf8",
      "subject_id": "6991c75b024cb89cdc04efd2",
      "name": "Production App",
      "before": "{\"timezone\":\"UTC\"}",
      "after": "{\"timezone\":\"Europe/Istanbul\"}"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `sEcho` | String | Echo value copied from request. |
| `iTotalRecords` | Number | Estimated total log count minus metadata row (`meta_v2`). |
| `iTotalDisplayRecords` | Number | Count after filters are applied. |
| `aaData` | Array | Log rows for current query page. |
| `aaData[]._id` | String | Log document ID (not present in export mode). |
| `aaData[].a` | String | Action identifier. |
| `aaData[].i` | Object | Original payload object (standard mode only). |
| `aaData[].ts` | Number | Unix timestamp (seconds). |
| `aaData[].cd` | String | Creation date (standard mode only). |
| `aaData[].u` | String | Actor email/username. |
| `aaData[].ip` | String or Null | Recorded client IP or null (depending on configuration). |
| `aaData[].app_id` | String | Related app id if available. |
| `aaData[].user_id` | String | Related user id if available. |
| `aaData[].subject_id` | String | Flattened subject id in export mode. |
| `aaData[].name` | String | Flattened name in export mode when payload has `name`. |
| `aaData[].before` | String | JSON-stringified pre-change snapshot in export mode. |
| `aaData[].after` | String | JSON-stringified post-change snapshot in export mode. |
| `aaData[].value` | String | JSON-stringified payload when before/after fields are not available. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

- `400`

```json
{
  "result": "Token not valid"
}
```

- `401`

```json
{
  "result": "User does not exist"
}
```

- `401`

```json
{
  "result": "User does not have right"
}
```

- `401`

```json
{
  "result": "User is locked"
}
```

- `401`

```json
{
  "result": "Token is invalid"
}
```

## Behavior/Processing

- Invalid `query` JSON does not fail the request; filter falls back to `{}`.
- Invalid regex in `sSearch` is ignored and request continues without search filter.
- Sorting is applied only when both `iSortCol_0` and `sSortDir_0` are valid and mapped.
- In export mode, endpoint removes `_id`, `cd`, and nested `i`, then flattens payload into export fields.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.systemlogs` | System log query source | Reads log documents and metadata row used in totals. |

---

## Examples

### Query last 50 system log records

```plaintext
/o?method=systemlogs&api_key=YOUR_API_KEY&iDisplayStart=0&iDisplayLength=50&sEcho=1
```

### Query app-related updates in selected period

```plaintext
/o?method=systemlogs&api_key=YOUR_API_KEY&period=30days&query={"a":"app_updated","app_id":"6991c75b024cb89cdc04efd2"}
```

### Export filtered results

```plaintext
/o?method=systemlogs&api_key=YOUR_API_KEY&query={"a":{"$in":["user_created","user_deleted"]}}&export=true
```

## Limitations

- Uses estimated total count for `iTotalRecords`; value can be approximate on very large datasets.
- Sorting is limited to the fixed column mapping used by endpoint.

---

## Related Endpoints

- [System Logs - Metadata](o-systemlogs-meta.md)
- [System Logs - Record](i-systemlogs.md)

## Last Updated

2026-03-05
