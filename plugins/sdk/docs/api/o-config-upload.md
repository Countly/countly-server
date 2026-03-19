---
sidebar_label: "Config Upload"
---

# SDK - Config Upload

## Endpoint

```plaintext
/o?method=config-upload
```

## Overview

Saves SDK config for an app.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `sdk` `Update` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `config-upload`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | App id. |
| `config` | String (JSON Object) or Object | Yes | SDK config payload. Accepts raw config or wrapped payload with `c` field. |

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
| `result` | String | `Success` when config is saved. |

### Error Responses

- `400`

```json
{
  "result": "Invalid config format"
}
```

- `400`

```json
{
  "result": "Config must be a valid object"
}
```

- `500`

```json
{
  "result": "Error saving config to database"
}
```

## Behavior/Processing

- If `config` is a string, endpoint parses it as JSON.
- If payload has `c`, endpoint stores `config.c`; otherwise stores `config` directly.
- Unknown keys are removed; only SDK valid option keys are saved.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_out.sdk_configs` | SDK config storage | Upserts app config as `{ _id: app_id, config: ... }`. |

---

## Examples

### Upload SDK config

```plaintext
/o?method=config-upload&api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&config={"tracking":true,"crt":true,"bom":true,"bom_rqp":50}
```

## Related Endpoints

- [SDK - Config Read](o-sdk-config-read.md)
- [SDK - SDK Config Read](o-sdk-config.md)

## Last Updated

2026-03-05
