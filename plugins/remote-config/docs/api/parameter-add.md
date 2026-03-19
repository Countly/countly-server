---
sidebar_label: "Parameter Create"
---

# Remote Config - Parameter Create

## Endpoint

```plaintext
/i/remote-config/add-parameter
```

## Overview

Creates a remote config parameter document for the app.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `remote_config` `Create` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | App id. |
| `parameter` | String (JSON Object) | Yes | Parameter object payload. |

### Parameter Structure (`parameter`)

| Field | Type | Required | Description |
|---|---|---|---|
| `parameter_key` | String | Yes | Must match `^[a-zA-Z_][a-zA-Z0-9_]*$`. |
| `default_value` | Any | Yes | Default value used when no condition matches. |
| `status` | String | No | Defaults to `Running` when omitted. |
| `conditions` | Array | No | Condition-value list for this parameter. |
| `_id` | String/ObjectId | No | Optional id for internal insertion paths. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `remote-config.maximum_allowed_parameters` | `2000` | Validation limit | Create fails once app reaches parameter limit. |
| `remote-config.conditions_per_paramaeters` | `20` | Validation limit | Create fails when parameter has too many conditions. |

## Response

### Success Response

```json
{}
```

### Response Fields

No fields are returned on success for this endpoint.

### Error Responses

- `400`

```json
{
  "result": "Invalid parameter: parameter_key"
}
```

- `400`

```json
{
  "result": "Invalid parameter: default_value"
}
```

- `500`

```json
{
  "result": "The parameter already exists"
}
```

- `500`

```json
{
  "result": "Maximum parameters limit reached"
}
```

- `500`

```json
{
  "result": "Maximum conditions limit reached"
}
```

## Behavior/Processing

- Parses `parameter` JSON string.
- Sets `status` to `Running` when missing.
- Builds `valuesList` from default value and condition values.
- Stores `ts` timestamp on parameter record.
- Emits system log action: `rc_parameter_created`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_out.remoteconfig_parameters{appId}` | Parameter storage | Validates duplicates/limits and inserts parameter document. |
| `countly.systemlogs` | Audit trail | Receives `rc_parameter_created` action. |

---

## Examples

### Create a parameter

```plaintext
/i/remote-config/add-parameter?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&parameter={"parameter_key":"button_color","default_value":"#FF5722","description":"Checkout button color"}
```

## Limitations

- `parameter` must be valid JSON string.
- Parameter key must be unique per app.

---

## Related Endpoints

- [Remote Config - Parameter Update](parameter-update.md)
- [Remote Config - Parameter Delete](parameter-remove.md)

## Last Updated

2026-03-05
