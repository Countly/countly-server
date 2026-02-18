---
sidebar_label: "Template Read"
---

# Populator - Template Read

## Endpoint

```text
/o/populator/templates
```

## Overview

Returns template definitions used by Populator. Supports full list mode, single-template mode, and optional platform filtering.

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
| `app_id` | String | Yes | App context for permission checks. |
| `api_key` | String | Conditional | Required when `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required when `api_key` is not provided. |
| `template_id` | String | No | When set, returns one template object (or `404`). |
| `platform_type` | String | No | Filters templates by matching `platformType` array values. |

## Response

### Success Response

List mode (`template_id` not set):

```json
[
  {
    "_id": "65f0cbf8bca6b8e8fbf7f901",
    "name": "Subscription Demo",
    "uniqueUserCount": 1200,
    "platformType": ["iOS", "Android"],
    "isDefault": true,
    "users": [],
    "events": [],
    "views": [],
    "sequences": [],
    "behavior": {},
    "generatedOn": 1709900000000
  }
]
```

Single-template mode (`template_id` set and found):

```json
{
  "_id": "65f0cbf8bca6b8e8fbf7f901",
  "name": "Subscription Demo",
  "uniqueUserCount": 1200,
  "platformType": ["iOS", "Android"],
  "isDefault": true,
  "users": [],
  "events": [],
  "views": [],
  "sequences": [],
  "behavior": {},
  "generatedOn": 1709900000000
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `_id` | String | Template document ID. |
| `name` | String | Template name. |
| `uniqueUserCount` | Number | Target unique user count. |
| `platformType` | Array (String) | Platforms included in template. |
| `isDefault` | Boolean | Default-template indicator. |
| `users` | Array | User-generation definitions. |
| `events` | Array | Event-generation definitions. |
| `views` | Array | View-generation definitions. |
| `sequences` | Array | Sequence definitions. |
| `behavior` | Object | Behavior configuration. |
| `generatedOn` | Number | Timestamp when template was generated/saved. |

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

`404 Not Found`

```json
{
  "result": "Could not find template with id \"65f0cbf8bca6b8e8fbf7f901\""
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
| List templates | `template_id` not provided | Queries templates (optionally with `platform_type`) and returns all matches. | Raw root array: `[ ... ]` |
| Single template | `template_id` provided and found | Queries by `_id` and returns one document. | Raw root object: `{ ... }` |
| Template not found | `template_id` provided and no match | Returns not-found message. | Wrapped object: `{ "result": "Could not find template with id ..." }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.populator_templates` | Template storage | Reads template documents by optional `_id` and optional `platformType` filter. |
| `countly.members` | Authentication and authorization | Reads member context for permission checks. |
| `countly.apps` | App rights validation | Reads app access context from `app_id`. |

---

## Examples

### Read all templates

```text
https://your-server.com/o/populator/templates?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY
```

### Read one template

```text
https://your-server.com/o/populator/templates?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  template_id=65f0cbf8bca6b8e8fbf7f901
```

### Read templates for a specific platform

```text
https://your-server.com/o/populator/templates?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  platform_type=iOS
```

## Limitations

- `platform_type` matching is exact string matching against entries in `platformType`.
- In single-template mode, this endpoint returns `404` unless exactly one document matches the provided ID.

---

## Related Endpoints

- [Populator - Template Create](i-populator-templates-create.md)
- [Populator - Template Edit](i-populator-templates-edit.md)
- [Populator - Template Remove](i-populator-templates-remove.md)

## Last Updated

2026-02-17
