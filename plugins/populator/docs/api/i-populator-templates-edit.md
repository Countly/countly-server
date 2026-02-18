---
sidebar_label: "Template Edit"
---

# Populator - Template Edit

## Endpoint

```text
/i/populator/templates/edit
```

## Overview

Updates an existing populator template. This endpoint replaces the template document with the submitted payload and updates editor metadata.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `Update` permission for the Populator feature.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `app_id` | String | Yes | App context for permission checks. |
| `api_key` | String | Conditional | Required when `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required when `api_key` is not provided. |
| `template_id` | String | Yes | Template document ID to update. |
| `_id` | String | Yes | Current template ID used for duplicate-name comparison. |
| `name` | String | Yes | Template name (must remain unique). |
| `uniqueUserCount` | Number | Yes | Expected unique user count. |
| `platformType` | Array | Yes | Target platforms. |
| `isDefault` | Boolean or String | No | `'true'` becomes `true`; all other values become `false`. |
| `lastEditedBy` | String | No | Optional value; endpoint also sets editor name from current member. |
| `users` | Array | No | User-generation definitions. |
| `events` | Array | No | Event-generation definitions. |
| `views` | Array | No | View/screen-generation definitions. |
| `sequences` | Array | No | Sequence definitions. |
| `behavior` | Object | No | Behavior configuration. |
| `generated_on` | Number | No | Optional override for stored generation timestamp. |

### Template Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Unique template name. |
| `uniqueUserCount` | Number | Yes | Target number of generated users. |
| `platformType` | Array (String) | Yes | Platforms included in template output. |
| `isDefault` | Boolean/String | No | Default-template flag normalized to boolean. |
| `users` | Array | No | User attribute distributions. |
| `events` | Array | No | Event definitions and segment distributions. |
| `views` | Array | No | Screen/view generation definitions. |
| `sequences` | Array | No | Sequence definitions used for behavior flows. |
| `behavior` | Object | No | Additional behavior controls. |

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
| `result` | String | `Success` when replace completes. |

### Error Responses

`400 Bad Request`

```json
{
  "result": "Invalid params: ..."
}
```

`400 Bad Request`

```json
{
  "result": "Template with name Subscription Demo already exists"
}
```

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

`404 Not Found`

```json
{
  "result": "Template not found"
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
| Template updated | Valid ID and payload | Validates payload, checks duplicate name, replaces template document. | Wrapped object: `{ "result": "Success" }` |
| Duplicate name | Another template already has `name` | Stops before replace. | Wrapped object: `{ "result": "Template with name ... already exists" }` |
| Invalid ID | `template_id` cannot be parsed | Stops update path and returns error. | Wrapped object: `{ "result": "Invalid template id." }` |

### Impact on Other Data

- Replaces one document in `countly.populator_templates`.
- Updates `lastEditedBy` with current member name.
- Optionally overrides `generatedOn` from `generated_on`.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `populator_template_edited` | Template replace succeeds | `{ before, update }` objects for audit comparison. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.populator_templates` | Template storage | Reads by `name` for uniqueness and replaces target template document. |
| `countly.members` | Authentication and authorization | Reads member context and editor name. |
| `countly.apps` | App rights validation | Reads app access context from `app_id`. |

---

## Examples

### Rename and adjust template volume

```text
https://your-server.com/i/populator/templates/edit?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  template_id=65f0cbf8bca6b8e8fbf7f901&
  _id=65f0cbf8bca6b8e8fbf7f901&
  name=Subscription Demo v2&
  uniqueUserCount=1500&
  platformType=["iOS","Android"]
```

### Update template for web expansion

```text
https://your-server.com/i/populator/templates/edit?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  template_id=65f0cbf8bca6b8e8fbf7f901&
  _id=65f0cbf8bca6b8e8fbf7f901&
  name=Subscription Demo v2&
  uniqueUserCount=1800&
  platformType=["iOS","Android","Web"]&
  isDefault=true
```

## Limitations

- This endpoint uses full-document replacement; fields omitted from the submitted payload are not preserved automatically.
- Duplicate-name check compares submitted `_id` with matched documents; `_id` should match `template_id` for same-template renames.

---

## Related Endpoints

- [Populator - Template Create](i-populator-templates-create.md)
- [Populator - Template Read](o-populator-templates.md)
- [Populator - Template Remove](i-populator-templates-remove.md)

## Last Updated

2026-02-17
