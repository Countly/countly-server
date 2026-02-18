---
sidebar_label: "Consent Search"
---

# Compliance Hub - Consent Search

## Endpoint

```text
/o/consent/search
```

## Overview

Searches consent event history with filtering, sorting, and pagination. Supports MongoDB and ClickHouse adapters.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `compliance_hub` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `app_id` | String | Yes | Target app ID. |
| `sSearch` | String | No | Text search used against device ID. |
| `filter` / `query` | JSON String (Object) | No | JSON-stringified filter object. |
| `project` / `projection` | JSON String (Object) | No | Projection object for returned fields. |
| `sort` | JSON String (Object) | No | Explicit sort object. |
| `iSortCol_0` | Number | No | DataTables sort column index. |
| `sSortDir_0` | String | No | DataTables sort direction (`asc`/`desc`). |
| `limit` / `iDisplayLength` | Number | No | Page size (default `20`). |
| `skip` / `iDisplayStart` | Number | No | Offset (MongoDB mode). |
| `cursor` | String | No | Cursor token (ClickHouse mode). |
| `paginationMode` | String | No | ClickHouse pagination mode, defaults to `snapshot`. |
| `period` | String | No | Optional period filter. |
| `db_override` | String | No | Adapter override (`clickhouse` uses ClickHouse path; other values use MongoDB path). |
| `comparison` | String | No | Comparison mode forwarded to query execution layer. |
| `sEcho` | String or Number | No | Echo value returned in DataTables-style response. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Response

### Success Response

MongoDB path:

```json
{
  "sEcho": "1",
  "iTotalRecords": 150,
  "iTotalDisplayRecords": 40,
  "aaData": [
    {
      "device_id": "device_123",
      "uid": "user_1",
      "type": "sessions",
      "change": {
        "sessions": true
      },
      "ts": 1739788800000
    }
  ]
}
```

ClickHouse path (`db_override=clickhouse`):

```json
{
  "sEcho": "1",
  "iTotalRecords": 150,
  "iTotalDisplayRecords": 150,
  "aaData": [
    {
      "device_id": "device_123",
      "uid": "user_1",
      "type": "sessions",
      "change": {
        "sessions": true
      },
      "ts": 1739788800000
    }
  ],
  "hasNextPage": true,
  "nextCursor": "eyJ0cyI6MTczOTc4ODgwMDAwMCwiZGlkIjoiZGV2aWNlXzEyMyJ9",
  "paginationMode": "snapshot",
  "isApproximate": false
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `sEcho` | String or Number | Echo value from request. |
| `iTotalRecords` | Number | Total records matched for base query. |
| `iTotalDisplayRecords` | Number | Display-count value (`filteredTotal` for MongoDB; total for ClickHouse). |
| `aaData` | Array | Consent event rows transformed to compatibility shape. |
| `hasNextPage` | Boolean | Present in ClickHouse mode when more rows are available. |
| `nextCursor` | String | Next cursor token for ClickHouse pagination. |
| `paginationMode` | String | ClickHouse pagination mode used. |
| `isApproximate` | Boolean | Approximation indicator from ClickHouse query engine. |

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
  "result": "Missing parameter \"app_id\""
}
```

- `401`

```json
{
  "result": "User does not have right"
}
```

- `400`

```json
{
  "result": "Error. Please check logs."
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| MongoDB mode | `db_override` absent/unsupported | Queries consent history from drill-events MongoDB path with skip/limit pagination. | Raw DataTables-style object |
| ClickHouse mode | `db_override=clickhouse` | Uses ClickHouse query adapter with cursor/snapshot pagination support. | Raw DataTables-style object with optional cursor fields |

### Impact on Other Data

- Read-only endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and feature access for read validation. |
| `countly.apps` | App validation/context loading | Validates `app_id` and app context for search scope. |
| `countly_drill.drill_events` | Primary consent-event history source | Reads `[CLY]_consent` event rows for MongoDB adapter. |
| ClickHouse consent events table | Consent-event history source (ClickHouse adapter) | Reads consent events via ClickHouse query adapter when enabled. |

---

## Examples

### Search consents with MongoDB pagination

```text
/o/consent/search?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  sSearch=device_123&
  limit=20&
  skip=0
```

### Search consents with ClickHouse cursor

```text
/o/consent/search?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  db_override=clickhouse&
  limit=50&
  paginationMode=snapshot
```

## Related Endpoints

- [Compliance Hub - Consent Current](o-consent-current.md)
- [Compliance Hub - Consent Search Old](o-consent-searchold.md)

## Last Updated

2026-02-17
