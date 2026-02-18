---
sidebar_label: "App Users Consents"
---

# Compliance Hub - App Users Consents

## Endpoint

```text
/o/app_users/consents
```

## Overview

Returns app users with consent fields from the app-users collection using search/sort/pagination controls.

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
| `query` / `filter` | JSON String (Object) | No | JSON-stringified user filter object. |
| `project` / `projection` | JSON String (Object) | No | Projection object; defaults to consent-related user fields. |
| `sort` | JSON String (Object) | No | Explicit sort object. |
| `iSortCol_0` | Number | No | DataTables sort column index. |
| `sSortDir_0` | String | No | DataTables sort direction (`asc`/`desc`). |
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
  "iTotalRecords": 1200,
  "iTotalDisplayRecords": 1200,
  "aaData": [
    {
      "did": "device_123",
      "d": "Chrome",
      "av": "1.2.0",
      "consent": {
        "sessions": true,
        "events": true,
        "crashes": false
      },
      "lac": 1739788800000,
      "uid": "user_1"
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
| `iTotalRecords` | Number | Total app-user records for query scope. |
| `iTotalDisplayRecords` | Number | Displayed total in response (same as total in this handler). |
| `aaData` | Array | App user records with consent and selected profile fields. |

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
  "result": "Application users query error"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| User-consent listing | App has user records | Runs app-user count, applies query/search/sort/pagination, returns DataTables-style payload. | Raw DataTables-style object |
| Empty app-users path | No users for app/query scope | Returns zero totals and empty data array. | Raw object with empty `aaData` |

### Impact on Other Data

- Read-only endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and feature access for read validation. |
| `countly.apps` | App validation/context loading | Validates `app_id` and app context for user lookup scope. |
| `countly.app_users{appId}` | App user consent source | Reads app user documents including `consent` and profile fields. |

---

## Examples

### List app users with consent data

```text
/o/app_users/consents?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  limit=20&
  skip=0
```

### Search by device ID

```text
/o/app_users/consents?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  sSearch=device_123
```

## Related Endpoints

- [Compliance Hub - Consent Current](o-consent-current.md)
- [Compliance Hub - Consent Search](o-consent-search.md)

## Last Updated

2026-02-17
