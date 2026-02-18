---
sidebar_label: "Consent Search Old"
---

# Compliance Hub - Consent Search Old

## Endpoint

```text
/o/consent/searchOld
```

## Overview

Legacy backup endpoint that searches old consent history documents from `consent_history`.

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
| `sSearch` | String | No | Device ID regex text filter. |
| `query` / `filter` | JSON String (Object) | No | JSON-stringified filter object. |
| `project` / `projection` | JSON String (Object) | No | Projection object. |
| `sort` | JSON String (Object) | No | Explicit sort object. |
| `iSortCol_0` | Number | No | DataTables sort column index. |
| `sSortDir_0` | String | No | DataTables sort direction (`asc`/`desc`). |
| `period` | String | No | Period filter translated to timestamp range on `ts`. |
| `limit` / `iDisplayLength` | Number | No | Page size. |
| `skip` / `iDisplayStart` | Number | No | Offset. |
| `sEcho` | String or Number | No | Echo value returned in response. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Response

### Success Response

```json
{
  "sEcho": "1",
  "iTotalRecords": 50,
  "iTotalDisplayRecords": 12,
  "aaData": [
    {
      "device_id": "device_123",
      "uid": "user_1",
      "type": "sessions",
      "after": {
        "sessions": true
      },
      "ts": 1739788800000,
      "app_id": "6991c75b024cb89cdc04efd2"
    }
  ]
}
```

Empty dataset response:

```json
{
  "sEcho": "1",
  "iTotalRecords": 0,
  "iTotalDisplayRecords": 0,
  "aaData": []
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `sEcho` | String or Number | Echo value from request. |
| `iTotalRecords` | Number | Total matched records for app-level query. |
| `iTotalDisplayRecords` | Number | Total matched records after applied filters. |
| `aaData` | Array | Consent history records. |

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
  "result": "MongoDB query error"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Legacy history search | Matching documents exist in `consent_history` | Applies query/search/sort/pagination and returns DataTables-style payload. | Raw DataTables-style object |
| Empty history | No documents for query | Returns empty DataTables-style payload. | Raw object with zero totals and empty `aaData` |

### Impact on Other Data

- Read-only endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and feature access for read validation. |
| `countly.apps` | App validation/context loading | Validates `app_id` and app context for search scope. |
| `countly.consent_history` | Legacy consent history source | Reads old consent history documents by app/query filters. |

---

## Examples

### Search legacy consent history

```text
/o/consent/searchOld?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  sSearch=device_123&
  limit=20&
  skip=0
```

## Limitations

- Legacy backup endpoint for old consent-history data path.
- Uses legacy collection shape (`after` field) instead of transformed modern consent-event output.

## Related Endpoints

- [Compliance Hub - Consent Search](o-consent-search.md)

## Last Updated

2026-02-17
