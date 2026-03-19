---
sidebar_label: "Hook Test"
---

# Hooks - Test

## Endpoint

```text
/i/hook/test
```

## Overview

Runs a hook configuration with provided mock input and returns execution results.

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
| `hook_config` | JSON String (Object) | Yes | JSON-stringified hook configuration to test. |
| `mock_data` | JSON String (Object) | Yes | JSON-stringified input payload passed to trigger processing. |
| `app_id` | String | Conditional | Required for non-global-admin users. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

### `hook_config` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Conditional | Required when `_id` is not present. |
| `description` | String | No | Hook description. |
| `_id` | String | No | Optional existing ID; test flow sets internal rule ID to `null` before execution. |
| `apps` | Array | Conditional | Required when `_id` is not present. |
| `trigger` | Object | Conditional | Required when `_id` is not present. |
| `trigger.type` | String | Conditional | Trigger type to instantiate for test run. |
| `trigger.configuration` | Object | Conditional | Trigger settings for selected trigger type. |
| `effects` | Array | Conditional | Required when `_id` is not present. |
| `effects[].type` | String | Conditional | Effect type to execute in sequence. |
| `effects[].configuration` | Object | Conditional | Effect settings for selected effect type. |
| `enabled` | Boolean | Conditional | Required when `_id` is not present. |

Decoded `hook_config` example:

```json
{
  "name": "Test HTTP effect",
  "description": "Validate outgoing call payload",
  "apps": ["6991c75b024cb89cdc04efd2"],
  "trigger": {
    "type": "InternalEventTrigger",
    "configuration": {
      "eventType": "/cohort/enter"
    }
  },
  "effects": [
    {
      "type": "HTTPEffect",
      "configuration": {
        "method": "post",
        "url": "https://example.com/webhooks/countly",
        "requestData": "{\"uid\":\"{{uid}}\"}",
        "headers": {
          "Content-Type": "application/json"
        }
      }
    }
  ],
  "enabled": true
}
```

Decoded `mock_data` example:

```json
{
  "app_id": "6991c75b024cb89cdc04efd2",
  "uid": "user_12345",
  "event": "/cohort/enter"
}
```

## Response

### Success Response

```json
{
  "result": [
    {
      "is_mock": true,
      "params": {
        "app_id": "6991c75b024cb89cdc04efd2",
        "uid": "user_12345",
        "event": "/cohort/enter"
      },
      "rule": {
        "name": "Test HTTP effect",
        "description": "Validate outgoing call payload",
        "trigger": {
          "type": "InternalEventTrigger",
          "configuration": {
            "eventType": "/cohort/enter"
          }
        },
        "effects": [
          {
            "type": "HTTPEffect",
            "configuration": {
              "method": "post",
              "url": "https://example.com/webhooks/countly",
              "requestData": "{\"uid\":\"{{uid}}\"}",
              "headers": {
                "Content-Type": "application/json"
              }
            }
          }
        ],
        "enabled": true,
        "_id": null
      },
      "logs": []
    },
    {
      "is_mock": true,
      "params": {
        "app_id": "6991c75b024cb89cdc04efd2",
        "uid": "user_12345",
        "event": "/cohort/enter"
      },
      "effect": {
        "type": "HTTPEffect",
        "configuration": {
          "method": "post",
          "url": "https://example.com/webhooks/countly",
          "requestData": "{\"uid\":\"{{uid}}\"}",
          "headers": {
            "Content-Type": "application/json"
          }
        }
      },
      "logs": []
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Array | Ordered test execution results. |
| `result[0]` | Object | Trigger execution output snapshot. |
| `result[n].effect` | Object | Effect descriptor for that effect step. |
| `result[n].logs` | Array | Effect-level runtime messages/errors captured during execution. |

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
  "result": "Parsed hookConfig is invalid"
}
```

- `400`

```json
{
  "result": "Config invalid"
}
```

- `400`

```json
{
  "result": "Trigger is missing"
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

- `403`

```json
{
  "result": "hook config invalid{...}"
}
```

- `503`

```json
{
  "result": "Hook test failed. ECONNREFUSED: connection refused"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Condition | Result |
|---|---|---|
| Full trigger + effect test | Valid hook and mock data payloads | Runs trigger, then each effect sequentially, returns ordered result array. |
| Early return | Effect returns no `params` payload | Returns accumulated results immediately. |

### Impact on Other Data

This endpoint does not insert/update/delete hook documents.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and access metadata. |
| `countly.apps` | App validation for non-global-admin users | Reads app context during permission validation. |

---

## Examples

### Test a hook with mock data

```text
/i/hook/test?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  hook_config={
    "name":"Test HTTP effect",
    "description":"Validate outgoing call payload",
    "apps":["6991c75b024cb89cdc04efd2"],
    "trigger":{"type":"InternalEventTrigger","configuration":{"eventType":"/cohort/enter"}},
    "effects":[{"type":"HTTPEffect","configuration":{"method":"post","url":"https://example.com/webhooks/countly","requestData":"{\"uid\":\"{{uid}}\"}"}}],
    "enabled":true
  }&
  mock_data={
    "app_id":"6991c75b024cb89cdc04efd2",
    "uid":"user_12345",
    "event":"/cohort/enter"
  }
```

## Operational Considerations

- Complex effects can make test runs slow because effects are executed sequentially.
- Some effect types perform real outbound actions during test execution (for example HTTP requests or emails), depending on effect implementation and environment.

## Limitations

- `mock_data` parsing errors are surfaced through the generic `503 Hook test failed...` branch.
- Validation for effect configuration is strict for HTTP effects and loose for non-HTTP effects.

## Related Endpoints

- [Hooks - Save](i-hook-save.md)
- [Hooks - Read List](o-hook-list.md)

## Last Updated

2026-02-17
