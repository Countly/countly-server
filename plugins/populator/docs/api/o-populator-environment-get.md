---
sidebar_label: "Environment Read"
---

# Populator - Environment Read

## Endpoint

```text
/o/populator/environment/get
```

## Overview

Returns generated users for a specific environment in a DataTables-compatible payload with optional pagination and search.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `Read` permission for the Populator feature.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `app_id` | String | Yes | App ID used in environment-user ID prefix matching. |
| `template_id` | String | Yes | Template ID used in environment-user ID prefix matching. |
| `environment_id` | String | Yes | Environment ID used in environment-user ID prefix matching. |
| `api_key` | String | Conditional | Required when `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required when `api_key` is not provided. |
| `sEcho` | String/Number | No | Echo value returned as-is in the response. |
| `iDisplayStart` | Number | No | Offset. Default is `0`. |
| `iDisplayLength` | Number | No | Limit. `-1` means no limit. |
| `sSearch` | String | No | Case-insensitive substring filter for `userName`. |

## Response

### Success Response

```json
{
  "sEcho": 1,
  "iTotalRecords": 2,
  "iTotalDisplayRecords": 2,
  "aaData": [
    {
      "_id": "6991c75b024cb89cdc04efd2_65f0cbf8bca6b8e8fbf7f901_3c7ffdf5b8200ee192968ad89dd4e180d5386c01_device-ios-001",
      "userName": "qa_user_001",
      "platform": "iOS",
      "device": "iPhone 15",
      "appVersion": "3.2.1",
      "custom": {
        "plan": "premium"
      },
      "createdAt": 1709900000000
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `sEcho` | String/Number | Echo value from request. |
| `iTotalRecords` | Number | Total matching users for the environment filter. |
| `iTotalDisplayRecords` | Number | Same value as `iTotalRecords` in this handler. |
| `aaData` | Array (Object) | Page of matching environment-user records. |
| `aaData[]. _id` | String | Composite generated-user ID (`appId_templateId_environmentId_deviceId`). |
| `aaData[].userName` | String | Generated user name. |
| `aaData[].platform` | String | Generated user platform. |
| `aaData[].device` | String | Generated user device. |
| `aaData[].appVersion` | String | Generated user app version. |
| `aaData[].custom` | Object | Generated user custom properties. |
| `aaData[].createdAt` | Number | Record creation timestamp (ms). |

### Error Responses

`401 Unauthorized`

```json
{
  "result": "Missing parameter environment_id"
}
```

`401 Unauthorized`

```json
{
  "result": "Missing parameter template_id"
}
```

`401 Unauthorized`

```json
{
  "result": "Missing parameter app_id"
}
```

`400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

`500 Internal Server Error`

```json
{
  "result": "DATABASE_ERROR_MESSAGE"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Full list mode | `iDisplayLength` missing or `-1` | Counts matching users and returns all rows after optional skip. | Raw root object with `aaData` array |
| Paginated mode | `iDisplayLength` provided and not `-1` | Counts matching users, applies `skip` + `limit`. | Raw root object with `aaData` page |
| Search mode | `sSearch` provided | Adds case-insensitive `userName` regex filter before count/query. | Raw root object with filtered `aaData` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.populator_environment_users` | Generated environment users | Counts and aggregates users matching `_id` prefix and optional `userName` regex. |
| `countly.members` | Authentication and authorization | Reads member context for permission checks. |
| `countly.apps` | App rights validation | Reads app access context from `app_id`. |

---

## Examples

### Read first page of users

```text
https://your-server.com/o/populator/environment/get?
  app_id=6991c75b024cb89cdc04efd2&
  template_id=65f0cbf8bca6b8e8fbf7f901&
  environment_id=3c7ffdf5b8200ee192968ad89dd4e180d5386c01&
  api_key=YOUR_API_KEY&
  iDisplayStart=0&
  iDisplayLength=50&
  sEcho=1
```

### Search users by name in environment

```text
https://your-server.com/o/populator/environment/get?
  app_id=6991c75b024cb89cdc04efd2&
  template_id=65f0cbf8bca6b8e8fbf7f901&
  environment_id=3c7ffdf5b8200ee192968ad89dd4e180d5386c01&
  api_key=YOUR_API_KEY&
  sSearch=qa_user
```

### Read full environment user list

```text
https://your-server.com/o/populator/environment/get?
  app_id=6991c75b024cb89cdc04efd2&
  template_id=65f0cbf8bca6b8e8fbf7f901&
  environment_id=3c7ffdf5b8200ee192968ad89dd4e180d5386c01&
  api_key=YOUR_API_KEY&
  iDisplayLength=-1
```

## Operational Considerations

- For large environments, this endpoint executes both a count query and an aggregation query.
- Filtering is regex-based (`sSearch`), which may be expensive on large datasets.
- No explicit sort is applied, so returned order is database natural order.

## Limitations

- Requires all three identifiers (`app_id`, `template_id`, `environment_id`) before auth/permission checks continue.
- `iTotalRecords` and `iTotalDisplayRecords` are the same value in this handler.

---

## Related Endpoints

- [Populator - Environment List](o-populator-environment-list.md)
- [Populator - Environment Check](o-populator-environment-check.md)
- [Populator - Environment Save](i-populator-environment-save.md)
- [Populator - Environment Remove](o-populator-environment-remove.md)

## Last Updated

2026-02-17
