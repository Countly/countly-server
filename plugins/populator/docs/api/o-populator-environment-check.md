---
sidebar_label: "Environment Check"
---

# Populator - Environment Check

## Endpoint

```text
/o/populator/environment/check
```

## Overview

Checks whether an environment name is already used in the app. Matching is case-insensitive.

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
| `app_id` | String | Yes | App context used for duplicate check scope. |
| `api_key` | String | Conditional | Required when `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required when `api_key` is not provided. |
| `environment_name` | String | Yes | Name candidate to validate. |

## Response

### Success Response

Name available:

```json
{
  "result": true
}
```

Duplicate detected:

```json
{
  "errorMsg": "Duplicated environment name detected for this application! Please try with an another name"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Boolean | Returned as `true` when no matching name exists. |
| `errorMsg` | String | Returned when a duplicate name exists. |

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
  "result": "Database error: operation failed"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Name available | No environment matched by app/name regex | Returns availability result. | Raw root object: `{ "result": true }` |
| Duplicate name | At least one environment matches app/name regex | Returns duplicate message. | Raw root object: `{ "errorMsg": "..." }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.populator_environments` | Environment metadata lookup | Reads by `appId` and case-insensitive regex on `name`, with `limit(1)`. |
| `countly.members` | Authentication and authorization | Reads member context for permission checks. |
| `countly.apps` | App rights validation | Reads app access context from `app_id`. |

---

## Examples

### Check if a new environment name is available

```text
https://your-server.com/o/populator/environment/check?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  environment_name=Staging EU
```

### Detect duplicate environment name

```text
https://your-server.com/o/populator/environment/check?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  environment_name=production seed
```

## Limitations

- `environment_name` is matched via regex, so special regex characters can change matching behavior.
- Endpoint does not normalize whitespace; provide the intended final display name when checking.

---

## Related Endpoints

- [Populator - Environment Save](i-populator-environment-save.md)
- [Populator - Environment List](o-populator-environment-list.md)
- [Populator - Environment Read](o-populator-environment-get.md)

## Last Updated

2026-02-17
