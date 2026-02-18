---
sidebar_label: "Environment List"
---

# Populator - Environment List

## Endpoint

```text
/o/populator/environment/list
```

## Overview

Returns all saved environments for the selected app.

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
| `app_id` | String | Yes | App ID whose environments are returned. |
| `api_key` | String | Conditional | Required when `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required when `api_key` is not provided. |

## Response

### Success Response

```json
[
  {
    "_id": "3c7ffdf5b8200ee192968ad89dd4e180d5386c01",
    "name": "Production Seed",
    "templateId": "65f0cbf8bca6b8e8fbf7f901",
    "appId": "6991c75b024cb89cdc04efd2",
    "createdAt": 1709900000000
  },
  {
    "_id": "a5503f74ae6b7e3d686addfd23c87617f3890bfe",
    "name": "Staging EU",
    "templateId": "65f0cbf8bca6b8e8fbf7f901",
    "appId": "6991c75b024cb89cdc04efd2",
    "createdAt": 1709900500000
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `_id` | String | Environment ID (SHA-1 hash derived from app + environment name). |
| `name` | String | Environment display name. |
| `templateId` | String | Template ID associated with this environment. |
| `appId` | String | App ID for the environment. |
| `createdAt` | Number | Environment creation timestamp (ms). |

### Error Responses

`400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

`401 Unauthorized`

```json
{
  "result": "No app_id provided"
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
| Environment list | Valid auth and app access | Reads all environments where `appId` equals request `app_id`. | Raw root array: `[ ... ]` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.populator_environments` | Environment metadata | Reads all matching documents for `appId`. |
| `countly.members` | Authentication and authorization | Reads member context for permission checks. |
| `countly.apps` | App rights validation | Reads app access context from `app_id`. |

---

## Examples

### List all environments for one app

```text
https://your-server.com/o/populator/environment/list?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY
```

## Limitations

- Response is not paginated; large numbers of environments are returned in one array.
- Ordering depends on MongoDB natural order because no explicit sort is applied.

---

## Related Endpoints

- [Populator - Environment Save](i-populator-environment-save.md)
- [Populator - Environment Read](o-populator-environment-get.md)
- [Populator - Environment Remove](o-populator-environment-remove.md)

## Last Updated

2026-02-17
