---
sidebar_label: "Hook Save"
---

# Hooks - Save

## Endpoint

```text
/i/hook/save
```

## Overview

Creates a new hook or updates an existing hook using a single endpoint.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `hooks` `Create` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `hook_config` | JSON String (Object) | Yes | JSON-stringified hook payload for create or update. |
| `app_id` | String | Conditional | Required for non-global-admin users. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

### `hook_config` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | String | No | Existing hook ID. If present, endpoint runs update flow. |
| `name` | String | Conditional | Required in create flow (`_id` absent). |
| `description` | String | No | Human-readable hook description. |
| `apps` | Array | Conditional | Required in create flow; app IDs targeted by this hook. |
| `trigger` | Object | Conditional | Required in create flow; trigger definition. |
| `trigger.type` | String | Conditional | Trigger type (for example `InternalEventTrigger`). |
| `trigger.configuration` | Object | Conditional | Trigger configuration payload for selected type. |
| `effects` | Array | Conditional | Required in create flow; effect definitions. |
| `effects[].type` | String | Conditional | Effect type (for example `EmailEffect`, `HTTPEffect`, `CustomCodeEffect`). |
| `effects[].configuration` | Object | Conditional | Effect-specific configuration object. |
| `enabled` | Boolean | Conditional | Required in create flow. |

Decoded create payload example:

```json
{
  "name": "Notify Premium Cohort",
  "description": "Send email when users enter premium cohort",
  "apps": ["6991c75b024cb89cdc04efd2"],
  "trigger": {
    "type": "InternalEventTrigger",
    "configuration": {
      "eventType": "/cohort/enter"
    }
  },
  "effects": [
    {
      "type": "EmailEffect",
      "configuration": {
        "address": ["ops@example.com"],
        "emailTemplate": "User {{uid}} entered premium cohort"
      }
    }
  ],
  "enabled": true
}
```

Decoded update payload example:

```json
{
  "_id": "65f0cbf8bca6b8e8fbf7f901",
  "enabled": false,
  "description": "Temporarily disabled"
}
```

## Configuration Impact

These hooks settings affect runtime behavior after saving, but do not change the immediate save response shape:

- `refreshRulesPeriod`: controls how quickly saved rule changes are loaded into runtime cache.
- `pipelineInterval` and `batchActionSize`: affect execution throughput and latency when rules trigger.
- `requestLimit` and `timeWindowForRequestLimit`: can throttle effect execution per rule at runtime.

## Response

### Success Response

Create flow (`hook_config._id` absent):

```json
"65f0cbf8bca6b8e8fbf7f901"
```

Update flow (`hook_config._id` provided):

```json
{
  "_id": "65f0cbf8bca6b8e8fbf7f901",
  "name": "Notify Premium Cohort",
  "description": "Temporarily disabled",
  "apps": ["6991c75b024cb89cdc04efd2"],
  "trigger": {
    "type": "InternalEventTrigger",
    "configuration": {
      "eventType": "/cohort/enter"
    }
  },
  "effects": [
    {
      "type": "EmailEffect",
      "configuration": {
        "address": ["ops@example.com"],
        "emailTemplate": "User {{uid}} entered premium cohort"
      }
    }
  ],
  "enabled": false,
  "createdBy": "65d4a6d4d8d9a17e2f5b1001",
  "created_at": 1700000000000
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root value)` | String | Created hook ID in create flow. |
| `_id` | String | Updated hook ID in update flow response object. |
| `apps` | Array | Target app IDs configured for the hook. |
| `trigger` | Object | Trigger configuration currently stored for the hook. |
| `effects` | Array | Effect list currently stored for the hook. |
| `enabled` | Boolean | Current active state of the hook. |

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
  "result": "Token not valid"
}
```

- `400`

```json
{
  "result": "Invalid hookConfig"
}
```

- `400`

```json
{
  "result": "Not enough args"
}
```

- `400`

```json
{
  "result": "Invalid configuration for effects"
}
```

- `401`

```json
{
  "result": "No app_id provided"
}
```

- `401`

```json
{
  "result": "User does not exist"
}
```

- `401`

```json
{
  "result": "User does not have right"
}
```

- `401`

```json
{
  "result": "User is locked"
}
```

- `401`

```json
{
  "result": "App does not exist"
}
```

- `401`

```json
{
  "result": "Token is invalid"
}
```

- `500`

```json
{
  "result": "No result found"
}
```

- `500`

```json
{
  "result": "Failed to save an hook"
}
```

- `500`

```json
{
  "result": "Failed to create an hook"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Create hook | `_id` absent | Validates payload, adds `createdBy` and `created_at`, inserts into `hooks`. | Raw root hook ID string |
| Update hook | `_id` present | Updates existing hook document by ID and returns updated document. | Raw root hook object |

### Impact on Other Data

- Writes hook data to `countly.hooks`.
- Dispatches system log entries for create or update actions.

## Audit & System Logs

Successful writes dispatch `/systemlogs` with these actions:

- `hook_created`
- `hook_updated`

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and access metadata. |
| `countly.apps` | App validation for non-global-admin users | Reads app context during permission validation. |
| `countly.hooks` | Hook storage | Inserts new hook documents or updates existing hook documents. |

---

## Examples

### Create hook

```text
/i/hook/save?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  hook_config={
    "name":"Notify Premium Cohort",
    "description":"Send email when users enter premium cohort",
    "apps":["6991c75b024cb89cdc04efd2"],
    "trigger":{"type":"InternalEventTrigger","configuration":{"eventType":"/cohort/enter"}},
    "effects":[{"type":"EmailEffect","configuration":{"address":["ops@example.com"],"emailTemplate":"User {{uid}} entered premium cohort"}}],
    "enabled":true
  }
```

### Update hook

```text
/i/hook/save?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  hook_config={
    "_id":"65f0cbf8bca6b8e8fbf7f901",
    "enabled":false,
    "description":"Temporarily disabled"
  }
```

## Operational Considerations

- Saved changes are not applied to runtime execution instantly; rule cache refresh follows `refreshRulesPeriod`.
- Large effect lists increase execution cost when the rule triggers.

## Limitations

- If update flow runs with a non-existent `_id`, response is `500` with `No result found`.
- `HTTPEffect` validates URL format and rejects localhost/loopback targets at validation stage.

## Related Endpoints

- [Hooks - Read List](o-hook-list.md)
- [Hooks - Update Status](i-hook-status.md)
- [Hooks - Delete](i-hook-delete.md)
- [Hooks - Test](i-hook-test.md)

## Last Updated

2026-02-17
