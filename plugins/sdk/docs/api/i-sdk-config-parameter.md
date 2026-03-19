---
sidebar_label: "Config Parameter Update"
---

# SDK - Config Parameter Update

## Endpoint

```plaintext
/i/sdk-config/update-parameter
```

## Overview

Updates SDK config document for an app using `parameter` payload.

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
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | App id. |
| `parameter` | String (JSON Object) or Object | Yes | Full SDK config object to save under `config`. |

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
  "result": "Error parsing parameter"
}
```

- `400`

```json
{
  "result": "Missing parameter \"app_id\""
}
```

## Behavior/Processing

- Parses `parameter` if provided as JSON string.
- Saves payload as full `config` object for app.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_out.sdk_configs` | SDK config storage | Upserts app config as `{ _id: app_id, config: parameter }`. |

---

## Examples

### Update SDK config via parameter payload

```plaintext
/i/sdk-config/update-parameter?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&parameter={"tracking":true,"crt":true,"eqs":100}
```

## Related Endpoints

- [SDK - Config Upload](o-config-upload.md)
- [SDK - Config Read](o-sdk-config-read.md)

## Last Updated

2026-03-05
