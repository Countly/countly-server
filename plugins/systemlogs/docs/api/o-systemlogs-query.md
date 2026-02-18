---
sidebar_label: "Query System Logs"
---

# /o?method=systemlogs

## Overview

Query system logs with filtering, search, paging, and sorting. Returns results in DataTables-compatible format and supports export formatting.

---

## Endpoint


```plaintext
/o?method=systemlogs
```

## Authentication

- **Required**: Global admin permission (required)
- **HTTP Method**: GET or POST
- **Permissions**: Global Admin only

---


## Permissions

- Required: Global admin permission (required)

## Request Parameters

### Core Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `method` | String | Yes | Must be `systemlogs` |

### Filtering Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | String (JSON) | No | MongoDB-style filter object, JSON-encoded string |
| `sSearch` | String | No | Case-insensitive search on action field (`a`) |
| `period` | String | No | Time period filter; uses standard Countly period parsing |

### Paging and Sorting (DataTables)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `iDisplayStart` | Number | No | Offset for pagination |
| `iDisplayLength` | Number | No | Page size; `-1` for all |
| `iSortCol_0` | Number | No | Column index for sorting |
| `sSortDir_0` | String | No | Sort direction: `asc` or `desc` |
| `sEcho` | String | No | DataTables request counter |

### Export Mode

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `export` | Boolean/String | No | When present, converts log items to export-friendly fields |

---

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `dashboards.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `hooks.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `remote-config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `security.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.condition.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.conditions.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.eventSink.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.globally_enabled.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.json.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parameters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.passwordSecret.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.path.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.rate.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.test.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `systemlogs.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `two-factor-auth.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `views.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `COUNTLY_CONFIG_HOSTNAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONFIG_PROTOCOL` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |

## Response

### Success Response

**Status Code**: `200 OK`

**Body**:
```json
{
  "sEcho": "29",
  "iTotalRecords": 81270,
  "iTotalDisplayRecords": 390,
  "aaData": [
    {
      "_id": "6270ea3dbccff991b16ef7f0",
      "a": "clear_all",
      "i": {
        "app_id": "6181431e09e272efa5f64305",
        "name": "DTE_test_app"
      },
      "ts": 1651567165,
      "cd": "2022-05-03T08:39:25.256Z",
      "u": "deniz.erten@count.ly",
      "ip": null,
      "app_id": "6181431e09e272efa5f64305",
      "user_id": "617f9c7e5b25eea3b9afabf8"
    }
  ]
}
```

### Export Response (when `export` is set)

When `export` is present, each log item is flattened for export:

```json
{
  "sEcho": "1",
  "iTotalRecords": 3,
  "iTotalDisplayRecords": 3,
  "aaData": [
    {
      "a": "app_updated",
      "ts": 1707484489,
      "u": "admin@company.com",
      "ip": "203.0.113.10",
      "app_id": "63f9d5e...",
      "user_id": "617f9c...",
      "subject_id": "63f9d5e...",
      "name": "Production App",
      "before": "{\"timezone\":\"UTC\"}",
      "after": "{\"timezone\":\"Europe/Istanbul\"}"
    }
  ]
}
```

---


### Response Fields

| Field | Type | Description |
|---|---|---|
| `*` | Varies | Fields returned by this endpoint. See Success Response example. |


### Error Responses

```json
{
  "result": "Error"
}
```

## Data Structures

### Log Entry

| Field | Type | Description |
|-------|------|-------------|
| `_id` | String | Log document ID |
| `a` | String | Action name |
| `i` | Object | Action payload details |
| `ts` | Number | Unix timestamp (seconds) |
| `cd` | Date/String | Created date string |
| `u` | String | User email or username |
| `ip` | String/Null | Client IP, or null if redacted |
| `app_id` | String | App ID associated with action |
| `user_id` | String | User ID associated with action |

### Export Fields

| Field | Type | Description |
|-------|------|-------------|
| `subject_id` | String | Resolved ID: app/user/campaign/crash/appuser/_id |
| `name` | String | Optional entity name from payload |
| `before` | String | JSON string of pre-change values |
| `after` | String | JSON string of post-change values |
| `value` | String | JSON stringified payload if `before/after` not present |

---

## Examples

### Example 1: Basic query

**Request** (GET):
```bash
curl "https://your-server.com/o?method=systemlogs&api_key=YOUR_GLOBAL_ADMIN_KEY"
```

### Example 2: Search by action and paginate

**Request** (GET):
```bash
curl "https://your-server.com/o?method=systemlogs&api_key=YOUR_GLOBAL_ADMIN_KEY" \
  --data-urlencode "sSearch=app_" \
  --data-urlencode "iDisplayStart=0" \
  --data-urlencode "iDisplayLength=50" \
  --data-urlencode "iSortCol_0=1" \
  --data-urlencode "sSortDir_0=desc" \
  --data-urlencode "sEcho=5"
```

### Example 3: Query with JSON filter and export mode

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o" \
  -d "api_key=YOUR_GLOBAL_ADMIN_KEY" \
  -d "method=systemlogs" \
  -d "query={\"a\":{\"$in\":[\"user_created\",\"user_deleted\"]}}" \
  -d "export=true"
```

---

## Error Responses

| HTTP Code | Error | Description |
|-----------|-------|-------------|
| 400 | `Invalid query` | JSON parsing failed for `query` parameter |
| 401 | `Unauthorized` | Missing or invalid global admin API key |
| 500 | `Internal error` | Unexpected database or server error |

---

## Behavior Notes

- **Admin-only**: Uses global admin validation before querying logs.
- **Search behavior**: `sSearch` is applied to action field (`a`) via regex.
- **Date filtering**: `period` uses Countly standard period parsing to build `ts` range.
- **Sorting**: `iSortCol_0` maps to `ts`, `u`, `ip`, `a`, `i` based on column index.
- **Export mode**: Removes raw payload and flattens into `subject_id`, `name`, `before`, `after`, or `value`.
- **Meta row**: Total count uses `estimatedDocumentCount` and subtracts meta doc `meta_v2`.

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `systemlogs` | Audit trail | Stores system action records read/written by this endpoint. |

---

## Related Endpoints

- [System Logs Meta](./o-systemlogs-meta.md) - Get filter metadata and users
- [Record System Log](./i-systemlogs.md) - Write log entries

---

## Enterprise

Plugin: systemlogs
Endpoint: /o?method=systemlogs

## Last Updated

February 2026
