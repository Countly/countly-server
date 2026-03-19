---
sidebar_label: "Parameter Delete"
---

# Remote Config - Parameter Delete

## Endpoint

```plaintext
/i/remote-config/remove-parameter
```

## Overview

Deletes a parameter by id.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `remote_config` `Delete` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | App id. |
| `parameter_id` | String | Yes | Parameter document id. |

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
| `result` | String | `Success` when deletion completes. |

### Error Responses

- `500`

```json
{
  "result": "Failed to remove parameter"
}
```

## Behavior/Processing

- Reads parameter first for audit payload.
- Removes parameter by `_id`.
- Emits system log action: `rc_parameter_removed`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_out.remoteconfig_parameters{appId}` | Parameter storage | Reads and deletes parameter document by id. |
| `countly.systemlogs` | Audit trail | Receives `rc_parameter_removed` action. |

---

## Examples

### Delete a parameter

```plaintext
/i/remote-config/remove-parameter?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&parameter_id=65f1f7b2ad5b9b001f12ab34
```

## Related Endpoints

- [Remote Config - Parameter Create](parameter-add.md)
- [Remote Config - Parameter Update](parameter-update.md)

## Last Updated

2026-03-05
