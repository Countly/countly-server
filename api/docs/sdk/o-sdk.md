---
sidebar_label: "SDK Fetch Read"
---

# SDK Fetch - Read

## Endpoint

```plaintext
/o/sdk
```

## Overview

Processes SDK fetch requests for installed feature methods.

## Authentication

- SDK app key: `app_key`
- SDK device id: `device_id`

## Permissions

- No dashboard-user permission model. Access is controlled by valid `app_key` and SDK request validation logic.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `app_key` | String | Yes | Application key. |
| `device_id` | String | Yes | Device identifier. Used with app key to derive app-user hash. |
| `method` | String | Usually | Feature-specific method name handled by installed `/o/sdk` listeners. |
| `metrics` | Object/JSON String | No | Optional metrics object. String values are parsed when possible. |
| `checksum` | String | Conditionally | Required when app checksum salt is configured and SHA-1 checksum mode is used. |
| `checksum256` | String | Conditionally | Required when app checksum salt is configured and SHA-256 checksum mode is used. |
| `ip_address` | String | No | Optional explicit IP used instead of request IP. |
| `old_device_id` | String | No | Optional old device id for merge flows in applicable handlers. |

## Response

### Success Response

Example object-root success (method-dependent):

```json
{
  "segments": {
    "country": "US"
  },
  "configs": {
    "welcome": true
  }
}
```

Example wrapped success (method-dependent):

```json
{
  "result": "Success"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Any JSON type | Method-specific payload returned by the feature handling the request. |

### Error Responses

**Status Code**: `400 Bad Request`

```json
{
  "result": "Missing parameter \"app_key\" or \"device_id\""
}
```

**Status Code**: `400 Bad Request`

```json
{
  "result": "App does not exist"
}
```

**Status Code**: `400 Bad Request`

```json
{
  "result": "Invalid method"
}
```

**Status Code**: `200 OK`

```json
{
  "result": "Request does not match checksum"
}
```

**Status Code**: `200 OK`

```json
{
  "result": "Request does not have checksum"
}
```

**Status Code**: `200 OK`

```json
{
  "result": "Ignoring device_id"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Method handled | Installed feature handles requested SDK method | Returns method-specific payload. | Any JSON payload shape. |
| Unhandled method | No feature handles method | Returns invalid-method error. | Wrapped error string. |
| Checksum gate fail | App has checksum salt and checksum is missing/invalid | Request cancelled before method handling. | Wrapped informational error string with status `200`. |
| Ignored device id | `device_id` is zero-IDFA value | Request ignored. | Wrapped informational string with status `200`. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.apps` | App validation and settings source | Reads app record by `app_key`. |
| `countly.app_users{appId}` | App-user context source | Reads current app-user document by derived `_id`. |

---

## Examples

### Example 1: SDK fetch request

```plaintext
/o/sdk?app_key=YOUR_APP_KEY&device_id=DEVICE_ID&method=ab_fetch_experiments
```

### Example 2: Missing required params

```plaintext
/o/sdk?method=ab_fetch_experiments
```

```json
{
  "result": "Missing parameter \"app_key\" or \"device_id\""
}
```

---

## Operational Considerations

- Response contracts are owned by feature handlers, not by this core entrypoint.
- Monitoring should include both `400 Invalid method` rates and checksum-gate `200` informational responses.

## Limitations

- There is no single fixed success schema for this endpoint.

## Related Endpoints

- [SDK Ingestion](../bulk/ingestion.md)

## Last Updated

2026-02-17
