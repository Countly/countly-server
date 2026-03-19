---
sidebar_label: "Crash Groups Read"
---

# Crashes - Crash Groups Read

## Endpoint

```plaintext
/o?method=crashes
```

## Overview

Reads crash data in different modes: crash groups table, single crash group detail, affected user list, simple group list, or crash graph summary.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `crashes` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `crashes`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | App id. |
| `group` | String | No | Crash group id for group modes. |
| `userlist` | Boolean/String | No | With `group`, returns affected user ids array. |
| `list` | Boolean/String | No | Returns simplified crash groups list. |
| `graph` | Boolean/String | No | Returns aggregate crashes/users counters and trend data. |
| `query` | String (JSON Object) | No | Filter object for table mode. |
| `sSearch` | String | No | Regex search on crash name in table mode. |
| `filter` | String | No | Table mode preset (`crash-resolved`, `crash-hidden`, `crash-unresolved`, `crash-nonfatal`, `crash-fatal`, `crash-new`, `crash-viewed`, `crash-reoccurred`, `crash-resolving`). |
| `iDisplayStart` | Number | No | Table mode offset. |
| `iDisplayLength` | Number | No | Table mode page size. |
| `iSortCol_0` | Number | No | Table mode sort column index. |
| `sSortDir_0` | String | No | Table mode sort direction (`asc`/`desc`). |
| `sEcho` | String | No | Echo id returned in table mode response. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `crashes.report_limit` | Plugin config | Group detail mode | Limits number of latest reports included in `data` for single group response. |

## Response

### Success Response

Table mode:

```json
{
  "sEcho": "1",
  "iTotalRecords": 42,
  "iTotalDisplayRecords": 12,
  "aaData": [
    {
      "_id": "crash_group_1",
      "name": "NullPointerException",
      "reports": 7,
      "users": 5,
      "is_resolved": false,
      "nonfatal": true
    }
  ]
}
```

Group detail mode (`group`):

```json
{
  "_id": "crash_group_1",
  "name": "NullPointerException",
  "reports": 7,
  "users": 5,
  "total": 1200,
  "url": "b2b5...",
  "data": [
    {
      "_id": "65f1f7b2ad5b9b001f12ab34",
      "group": "crash_group_1",
      "uid": "user-123"
    }
  ]
}
```

Group user list mode (`group` + `userlist=true`):

```json
[
  "user-123",
  "user-456"
]
```

Simple list mode (`list=true`):

```json
[
  {
    "_id": "crash_group_1",
    "name": "NullPointerException"
  }
]
```

Graph mode (`graph=true`):

```json
{
  "users": {
    "total": 1200,
    "affected": 180,
    "fatal": 20,
    "nonfatal": 160
  },
  "crashes": {
    "total": 420,
    "unique": 35,
    "resolved": 10,
    "unresolved": 25
  },
  "data": {}
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object or Array | Response shape depends on mode. |
| `aaData` | Array | Crash groups rows in table mode. |
| `data` | Array/Object | Group report items (group detail mode) or time object (graph mode). |

### Error Responses

- `400`

```json
{
  "result": "Crash group not found"
}
```

Standard authentication/authorization errors from read validation.

## Behavior/Processing

- Default mode is DataTables-style crash group table.
- `group` mode loads one crash group plus latest drill reports.
- `list=true` returns simplified list only when app user count is below `10000`; otherwise returns empty array.
- Hidden crashes are excluded by default in table mode unless explicitly filtered.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.app_crashgroups{appId}` | Crash groups source | Reads group documents, metadata, and counters. |
| `countly.app_crashusers{appId}` | Affected users source | Reads user ids for crash group userlist mode. |
| `countly.app_users{appId}` | Total users source | Reads total user count for several modes. |
| `countly_drill.drill_events` | Crash report source | Reads latest crash reports for group detail mode. |

---

## Examples

### Table mode query

```plaintext
/o?method=crashes&api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&iDisplayStart=0&iDisplayLength=20&sEcho=1
```

### Group detail query

```plaintext
/o?method=crashes&api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&group=crash_group_1
```

### Group users query

```plaintext
/o?method=crashes&api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&group=crash_group_1&userlist=true
```

### Graph summary query

```plaintext
/o?method=crashes&api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&graph=true&period=30days
```

## Related Endpoints

- [Crashes - Reports Read](o-reports.md)
- [Crashes - User Crashes Read](o-user-crashes.md)

## Last Updated

2026-03-05
