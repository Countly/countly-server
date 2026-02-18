---
sidebar_label: "Template Remove"
---

# Populator - Template Remove

## Endpoint

```text
/i/populator/templates/remove
```

## Overview

Deletes a populator template and performs cascade cleanup for environments and generated environment users tied to that template.

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
| `app_id` | String | Yes | App context used for environment-user cleanup pattern. |
| `api_key` | String | Conditional | Required when `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required when `api_key` is not provided. |
| `template_id` | String | Yes | Template ID to delete. |

## Response

### Success Response

```json
{
  "result": "Success"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | `Success` when template and cascade cleanup complete. |

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
  "result": "Invalid template id."
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
| Cascade delete | Valid `template_id` and permissions | Deletes template, then deletes environment users and environments linked to template. | Wrapped object: `{ "result": "Success" }` |
| Invalid ID | `template_id` cannot be parsed | Stops before delete execution. | Wrapped object: `{ "result": "Invalid template id." }` |

### Impact on Other Data

- Deletes one template document from `countly.populator_templates`.
- Deletes matching generated users from `countly.populator_environment_users`.
- Deletes matching environment metadata from `countly.populator_environments`.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `populator_template_removed` | Template delete succeeds | `{ templateId }` |
| `populator_environment_removed_through_template` | Environment cascade cleanup succeeds | `{ templateId, appId }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.populator_templates` | Template storage | Deletes the target template document by `_id`. |
| `countly.populator_environment_users` | Generated environment users | Deletes records whose `_id` starts with `app_id + '_' + template_id`. |
| `countly.populator_environments` | Environment metadata | Deletes documents where `templateId` equals removed template ID. |
| `countly.members` | Authentication and authorization | Reads member context for permission checks. |
| `countly.apps` | App rights validation | Reads app access context from `app_id`. |

---

## Examples

### Remove a deprecated template and its generated environments

```text
https://your-server.com/i/populator/templates/remove?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  template_id=65f0cbf8bca6b8e8fbf7f901
```

## Operational Considerations

- Cleanup cost increases with the number of generated users tied to the template.
- Deletes are sequential and not transactional; partial cleanup is possible if an intermediate delete fails.

## Limitations

- Success response does not include counts of deleted users/environments.
- Cleanup of environment users depends on the `_id` prefix pattern built from `app_id` and `template_id`.

---

## Related Endpoints

- [Populator - Template Create](i-populator-templates-create.md)
- [Populator - Template Edit](i-populator-templates-edit.md)
- [Populator - Template Read](o-populator-templates.md)
- [Populator - Environment Remove](o-populator-environment-remove.md)

## Last Updated

2026-02-17
