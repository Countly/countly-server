---
sidebar_label: "SDK Config Read"
---

# SDK - SDK Config Read

## Endpoint

```plaintext
/o/sdk?method=sc
```

## Overview

Returns runtime SDK configuration for a device.

## Authentication

SDK authentication is used.

Required SDK identity parameters:
- `app_key`
- `device_id`

## Permissions

No dashboard permission check is applied. Access is validated through app/device context.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `sc`. |
| `app_key` | String | Yes | App key used by SDK endpoints. |
| `device_id` | String | Yes | Device/user identifier. |

## Response

### Success Response

```json
{
  "v": 2,
  "t": 1741286400000,
  "c": {
    "tracking": true,
    "crt": true,
    "vt": true,
    "bom": true,
    "bom_at": 10,
    "bom_rqp": 0.5
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `v` | Number | SDK config payload version (`2`). |
| `t` | Number | Server timestamp in milliseconds. |
| `c` | Object | Effective SDK config after enforcement filtering. |
| `c.bom_rqp` | Number | Returned as ratio (`0..1`) by dividing stored integer percent by `100`. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"app_key\" or \"device_id\""
}
```

- `400`

```json
{
  "result": "Error: undefined"
}
```

## Behavior/Processing

- Loads app config from `sdk_configs` and enforcement from `sdk_enforcement`.
- If enforcement has a key set to `false`, that key is removed from response `c`.
- Sets `v=2`, `t=Date.now()` on every response.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_out.sdk_configs` | SDK config source | Reads per-app SDK config (`config`). |
| `countly_out.sdk_enforcement` | Enforcement source | Reads per-app enforcement filter (`enforcement`). |

---

## Examples

### Read SDK config

```plaintext
/o/sdk?method=sc&app_key=YOUR_APP_KEY&device_id=device-123
```

## Related Endpoints

- [SDK - Config Upload](o-config-upload.md)
- [SDK - Enforcement Read](o-sdk-enforcement.md)

## Last Updated

2026-03-05
