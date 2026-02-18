---
sidebar_label: "Environment Remove"
---

# Populator - Environment Remove

## Endpoint

```text
/o/populator/environment/remove
```

## Overview

Deletes one environment and its generated users.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `Delete` permission for the Populator feature.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `app_id` | String | Yes | App ID used for generated-user cleanup pattern. |
| `template_id` | String | Yes | Template ID used for generated-user cleanup pattern. |
| `environment_id` | String | Yes | Environment ID to remove. |
| `api_key` | String | Conditional | Required when `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required when `api_key` is not provided. |

## Response

### Success Response

```json
{
  "result": true
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Boolean | `true` when delete sequence succeeds. |

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
| Environment cascade delete | Required params present and permissions granted | Deletes matching environment users, then deletes environment metadata. | Raw root object: `{ "result": true }` |

### Impact on Other Data

- Deletes generated users from `countly.populator_environment_users` whose `_id` starts with `app_id + '_' + template_id + '_' + environment_id`.
- Deletes matching environment metadata record in `countly.populator_environments`.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `populator_environment_removed` | Delete sequence succeeds | `{ environmentId, app_id, template_id }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.populator_environment_users` | Generated environment users | Deletes records by `_id` prefix match. |
| `countly.populator_environments` | Environment metadata | Deletes one environment document by `_id`. |
| `countly.members` | Authentication and authorization | Reads member context for permission checks. |
| `countly.apps` | App rights validation | Reads app access context from `app_id`. |

---

## Examples

### Remove one test environment

```text
https://your-server.com/o/populator/environment/remove?
  app_id=6991c75b024cb89cdc04efd2&
  template_id=65f0cbf8bca6b8e8fbf7f901&
  environment_id=3c7ffdf5b8200ee192968ad89dd4e180d5386c01&
  api_key=YOUR_API_KEY
```

## Operational Considerations

- Deletion cost scales with the number of generated users in the target environment.
- User deletion and environment deletion are separate operations and are not transactional.

## Limitations

- Endpoint does not return the number of deleted user rows.
- Missing or wrong `app_id` can reduce cleanup scope of generated users because cleanup uses `_id` prefix matching.

---

## Related Endpoints

- [Populator - Environment Save](i-populator-environment-save.md)
- [Populator - Environment List](o-populator-environment-list.md)
- [Populator - Environment Read](o-populator-environment-get.md)
- [Populator - Template Remove](i-populator-templates-remove.md)

## Last Updated

2026-02-17
