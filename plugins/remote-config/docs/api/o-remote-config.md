---
sidebar_label: "Dashboard Read"
---

# Remote Config - Dashboard Read

## Endpoint

```plaintext
/o?method=remote-config
```

## Overview

Returns all remote config parameters and conditions for dashboard management views.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `remote_config` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `remote-config`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | App id. |

## Response

### Success Response

```json
{
  "parameters": [
    {
      "_id": "65f1f7b2ad5b9b001f12ab34",
      "parameter_key": "button_color",
      "default_value": "#FF5722",
      "description": "Checkout button color",
      "status": "Running",
      "conditions": [
        {
          "condition_id": "65f1f7b2ad5b9b001f12ab99",
          "value": "#0099FF"
        }
      ]
    }
  ],
  "conditions": [
    {
      "_id": "65f1f7b2ad5b9b001f12ab99",
      "condition_name": "iOS Users",
      "condition_color": 1,
      "condition": "{\"up._os\":{\"$eq\":\"iOS\"}}",
      "used_in_parameters": 1
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `parameters` | Array | Full parameter documents for app. |
| `conditions` | Array | Full condition documents for app. |
| `conditions[].used_in_parameters` | Number | Count of parameters currently referencing that condition id. |

### Error Responses

- `401`

```json
{
  "result": "Error while fetching remote config data."
}
```

## Behavior/Processing

- Reads all parameters and all conditions from app collections.
- Computes `used_in_parameters` count for each condition at response time.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_out.remoteconfig_parameters{appId}` | Parameter source | Reads all parameter documents. |
| `countly_out.remoteconfig_conditions{appId}` | Condition source | Reads all condition documents and computes usage count. |

---

## Examples

### Read dashboard config model

```plaintext
/o?method=remote-config&api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2
```

## Limitations

- Returns full arrays; no pagination.

---

## Related Endpoints

- [Remote Config - Parameter Create](parameter-add.md)
- [Remote Config - SDK Read](o-sdk-rc.md)

## Last Updated

2026-03-05
