---
sidebar_label: "User Crashes Read"
---

# Crashes - User Crash Groups Read

## Endpoint

```plaintext
/o?method=user_crashes
```

## Overview

Returns crash groups associated with one user (`uid`) in DataTables response format.

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
| `method` | String | Yes | Must be `user_crashes`. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | Target app ID. |
| `uid` | String | Yes | User ID to query crash groups for. |
| `iDisplayStart` | Number | No | DataTables offset. |
| `iDisplayLength` | Number | No | DataTables page size (`-1` for all). |
| `iSortCol_0` | Number | No | DataTables sort column index. |
| `sSortDir_0` | String | No | DataTables sort direction (`asc` / `desc`). |
| `sEcho` | String | No | Echo ID returned in response. |
| `fromExportAPI` | Boolean/String | No | If truthy, resolves crash group names and includes group id field. |

## Response

### Success Response

```json
{
  "sEcho": "1",
  "iTotalRecords": 2,
  "iTotalDisplayRecords": 2,
  "aaData": [
    {
      "group": "crash_group_1",
      "reports": 5,
      "last": 1707123456789
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `sEcho` | String | DataTables echo value. |
| `iTotalRecords` | Number | Total rows returned. |
| `iTotalDisplayRecords` | Number | Total rows after filtering (same as `iTotalRecords` here). |
| `aaData` | Array | User crash group rows. |
| `aaData[].group` | String | Crash group ID or group name (`fromExportAPI` mode). |
| `aaData[].id` | String | Present in export mode; original crash group ID. |
| `aaData[].reports` | Number | Report count for group/user combination. |
| `aaData[].last` | Number or String | Last timestamp, or `'Unknow'` in export mode when missing. |

### Error Responses

- `400`

```json
{
  "result": "Please provide user uid"
}
```

Standard auth/permission errors from read validation can also be returned.

## Behavior/Processing

- Reads `app_crashusers{appId}` by `uid` and keeps rows with non-zero `reports` and `group !== 0`.
- Returns DataTables envelope with pagination/sorting support.
- In `fromExportAPI` mode, resolves group names from `app_crashgroups{appId}` and rewrites `group` to name.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.app_crashusers{appId}` | User crash linkage | Reads crash groups/reports for requested user. |
| `countly.app_crashgroups{appId}` | Group name lookup | Read-only lookup in export mode (`fromExportAPI`). |

## Examples

### Read crash groups for one user

```plaintext
/o?
  method=user_crashes&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  uid=user_12345&
  iDisplayStart=0&
  iDisplayLength=50
```

## Last Updated

2026-03-07
