---
sidebar_label: "Template Create"
---

# Populator - Template Create

## Endpoint

```text
/i/populator/templates/create
```

## Overview

Creates a new data-population template. Templates define the user/event/view/behavior payload that can be reused when generating test environments.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `Create` permission for the Populator feature.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `app_id` | String | Yes | App context for permission checks. |
| `api_key` | String | Conditional | Required when `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required when `api_key` is not provided. |
| `name` | String | Yes | Template name. Must be unique. |
| `uniqueUserCount` | Number | Yes | Expected unique user count for generated data. |
| `platformType` | Array | Yes | Platforms to generate for (for example `iOS`, `Android`, `Web`). |
| `isDefault` | Boolean or String | No | `'true'` becomes `true`; all other values become `false`. |
| `lastEditedBy` | String | No | Optional editor label stored with the template. |
| `users` | Array | No | User-generation definitions. |
| `events` | Array | No | Event-generation definitions. |
| `views` | Array | No | View/screen-generation definitions. |
| `sequences` | Array | No | Sequence definitions. |
| `behavior` | Object | No | Behavior configuration. |

### Template Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Unique template name. |
| `uniqueUserCount` | Number | Yes | Target number of generated users. |
| `platformType` | Array (String) | Yes | Platforms included in generated data. |
| `isDefault` | Boolean/String | No | Default-template flag normalized to boolean. |
| `users` | Array | No | User attribute distributions. |
| `events` | Array | No | Event definitions and optional segment distributions. |
| `views` | Array | No | Screen/view generation definitions. |
| `sequences` | Array | No | Sequence definitions used for behavior flows. |
| `behavior` | Object | No | Additional behavior controls. |

Example payload:

```json
{
  "name": "Subscription Demo",
  "uniqueUserCount": 1200,
  "platformType": ["iOS", "Android"],
  "isDefault": "true",
  "users": [
    {
      "plan": ["free", "premium"],
      "country": ["US", "DE", "LT"]
    }
  ],
  "events": [
    {
      "purchase": [
        {
          "segments": {
            "item": ["starter_pack", "pro_pack"],
            "currency": ["USD", "EUR"]
          }
        }
      ]
    }
  ],
  "behavior": {
    "sequences": []
  }
}
```

## Response

### Success Response

```json
{
  "result": "Successfully created 65f0cbf8bca6b8e8fbf7f901"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Success message with inserted template ID. |

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
  "result": "Invalid type for behavior!"
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
| Template created | Valid payload and unique `name` | Normalizes values, sets `generatedOn`, inserts template. | Wrapped object: `{ "result": "Successfully created <id>" }` |
| Duplicate name | Existing template already uses `name` | Stops before insert. | Wrapped object: `{ "result": "Template with name ... already exists" }` |

### Impact on Other Data

- Inserts one document into `countly.populator_templates`.
- Sets `generatedOn` timestamp during insert.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `populator_template_created` | Template insert succeeds | Full created template payload. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.populator_templates` | Template storage | Reads by `name` for uniqueness, inserts new template document. |
| `countly.members` | Authentication and authorization | Reads member context for permission checks. |
| `countly.apps` | App rights validation | Reads app access context from `app_id`. |

---

## Examples

### Create a mobile subscription template

```text
https://your-server.com/i/populator/templates/create?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  name=Subscription Demo&
  uniqueUserCount=1200&
  platformType=["iOS","Android"]&
  isDefault=true
```

### Create a web-only template

```text
https://your-server.com/i/populator/templates/create?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  name=Checkout Web Journey&
  uniqueUserCount=450&
  platformType=["Web"]
```

## Limitations

- Template name uniqueness is checked globally in this handler.
- `behavior.sequences=[]` is normalized to an empty `behavior` object.

---

## Related Endpoints

- [Populator - Template Edit](i-populator-templates-edit.md)
- [Populator - Template Read](o-populator-templates.md)
- [Populator - Template Remove](i-populator-templates-remove.md)

## Last Updated

2026-02-17
