---
sidebar_label: "Config Rollout"
---

# Remote Config - Config Rollout

## Endpoint

```plaintext
/i/remote-config/add-complete-config
```

## Overview

Applies experiment rollout config by creating/updating parameters and optionally creating one condition in a single request.

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
| `config` | String (JSON Object) | Yes | Rollout payload. |

### Config Structure (`config`)

| Field | Type | Required | Description |
|---|---|---|---|
| `parameters` | Array | Yes | Parameter rollout entries. |
| `condition` | Object | No | Optional single condition to be created and attached. |

### `parameters[]` Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `parameter_key` | String | Yes | Must match `^[a-zA-Z_][a-zA-Z0-9_]*$`. |
| `exp_value` | Any | Yes | Winning/rolled-out value. |
| `default_value` | Any | Conditionally | Required when creating a new parameter with rollout condition. |
| `description` | String | No | Description for new parameter creation. |

### `condition` Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `condition_name` | String | Yes | Must match `^[a-zA-Z0-9 ]+$`. |
| `condition` | Object | Yes | Condition query object (stored as JSON string). |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `remote-config.maximum_allowed_parameters` | `2000` | Validation limit | Rollout fails when app is at parameter capacity. |
| `remote-config.conditions_per_paramaeters` | `20` | Validation limit | Rollout fails when existing parameter would exceed condition limit. |

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
  "result": "Invalid config"
}
```

- `400`

```json
{
  "result": "Invalid parameter: condition_name"
}
```

- `400`

```json
{
  "result": "Invalid parameter: parameter_key"
}
```

- `500`

```json
{
  "result": "Condition already exists or parameters limit reached"
}
```

- `500`

```json
{
  "result": "Maximum conditions per parameter reached"
}
```

- `500`

```json
{
  "result": "Error while adding the config."
}
```

## Behavior/Processing

- Existing parameters are updated by `parameter_key`.
- New parameters are inserted when key does not exist.
- If `condition` is provided, it is created once and linked to affected parameters as a top-priority condition value.
- Emits system log action: `rc_rollout`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_out.remoteconfig_parameters{appId}` | Parameter storage | Reads existing keys, inserts new parameters, updates existing parameters. |
| `countly_out.remoteconfig_conditions{appId}` | Condition storage | Optionally inserts one rollout condition. |
| `countly.systemlogs` | Audit trail | Receives `rc_rollout` action. |

---

## Examples

### Roll out values with a new condition

```plaintext
/i/remote-config/add-complete-config?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&config={"parameters":[{"parameter_key":"checkout_flow","exp_value":"variant_b","default_value":"variant_a","description":"Checkout rollout"}],"condition":{"condition_name":"New Users","condition":{"up.nc":{"$eq":1}}}}
```

### Roll out values without creating a condition

```plaintext
/i/remote-config/add-complete-config?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&config={"parameters":[{"parameter_key":"checkout_flow","exp_value":"variant_b"}]}
```

## Limitations

- Supports at most one condition object per call.
- Requires at least one parameter in `config.parameters`.

---

## Related Endpoints

- [Remote Config - Parameter Create](parameter-add.md)
- [Remote Config - Dashboard Read](o-remote-config.md)

## Last Updated

2026-03-05
