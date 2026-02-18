---
sidebar_label: "Get All Configs"
---

# /o?method=remote-config

## Overview

Dashboard endpoint to retrieve all remote config parameters and conditions for an application. Returns comprehensive configuration data including parameters with their conditions, default values, and usage statistics.

---

## Endpoint


```plaintext
/o?method=remote-config
```

## Authentication

- **Required**: API key with read access
- **HTTP Methods**: GET recommended (all methods supported)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with read permissions |
| `app_id` | String | Yes | Application ID |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `remote-config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.condition.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.conditions.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.conditions_per_paramaeters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.confirm.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.default.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.delete.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.description.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.js.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.json.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maximum_allowed_parameters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maximum_conditions_added.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parameter.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parameters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.percent.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.percentage.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.type.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.yes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

#### Success Response - Configuration Data
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "parameters": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "parameter_key": "button_color",
      "default_value": "#FF5733",
      "description": "Primary button color",
      "status": "Running",
      "expiry_dttm": null,
      "conditions": [
        {
          "condition_id": "507f191e810c19729de860ea",
          "condition_value": "#00FF00"
        }
      ],
      "c": 1523,
      "created_dttm": 1609459200000,
      "created_user": "user@example.com"
    }
  ],
  "conditions": [
    {
      "_id": "507f191e810c19729de860ea",
      "condition_name": "iOS Users",
      "condition_color": 1,
      "condition_definition": "{\"up._os\":{\"$eq\":\"iOS\"}}",
      "condition": {"up._os": {"$eq": "iOS"}},
      "seed_value": "button_color",
      "c": 823,
      "used_in_parameters": ["button_color", "max_items"],
      "created_dttm": 1609372800000,
      "created_user": "admin@example.com"
    }
  ]
}
```

---


### Response Fields

| Field | Type | Description |
|---|---|---|
| `*` | Varies | Fields returned by this endpoint. See Success Response example. |


### Error Responses

```json
{
  "result": "Error"
}
```

## Permissions

- Required permission: `remote-config` `Read` (validated via `validateRead`).


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Examples

### Example 1: Get all parameters and conditions

**Description**: Retrieve complete remote config for dashboard display

**Request** (GET):
```bash
curl "https://your-server.com/o?method=remote-config&api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{
  "parameters": [
    {
      "_id": "60d5ec49e6f1c72b4c8b4567",
      "parameter_key": "button_color",
      "default_value": "#FF5733",
      "description": "Primary button color",
      "status": "Running",
      "expiry_dttm": null,
      "conditions": [
        {
          "condition_id": "60d5ec20e6f1c72b4c8b4560",
          "condition_value": "#00FF00"
        }
      ],
      "c": 1523,
      "created_dttm": 1624614985000,
      "created_user": "admin@example.com"
    }
  ],
  "conditions": [
    {
      "_id": "60d5ec20e6f1c72b4c8b4560",
      "condition_name": "iOS Users",
      "condition_color": 1,
      "condition_definition": "{\"up._os\":{\"$eq\":\"iOS\"}}",
      "condition": {"up._os": {"$eq": "iOS"}},
      "seed_value": "button_color",
      "c": 823,
      "used_in_parameters": ["button_color"],
      "created_dttm": 1624614944000,
      "created_user": "admin@example.com"
    }
  ]
}
```

### Example 2: New app with no configuration

**Description**: Request configuration for app with no parameters yet

**Request** (GET):
```bash
curl "https://your-server.com/o?method=remote-config&api_key=YOUR_API_KEY&app_id=60d5ec90e6f1c72b4c8b4570"
```

**Response** (200):
```json
{
  "parameters": [],
  "conditions": []
}
```

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `remoteconfig_parameters{app_id}` | Remote config domain | Stores remote-config parameters, conditions, and related metadata. |
| `remoteconfig_conditions{app_id}` | Remote config domain | Stores remote-config parameters, conditions, and related metadata. |
| `No pagination` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Recommended limits` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Add Parameter](./parameter-add.md) - Create new parameter
- [Update Parameter](./parameter-update.md) - Modify parameter
- [Remove Parameter](./parameter-remove.md) - Delete parameter
- [Add Condition](./condition-add.md) - Create condition
- [Get Remote Config](./o-sdk-rc.md) - SDK endpoint (returns only active parameters)

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - config returned | JSON with parameters and conditions arrays |
| `200` | Success - no config exists | `{"parameters": [], "conditions": []}` |
| `400` | Missing app_id parameter | `{"result": 400, "message": "Missing parameter: app_id"}` |
| `401` | Invalid API key | `{"result": 401, "message": "Invalid API key"}` |

---

## Implementation Notes

1. **Dashboard-only endpoint**: Requires API key (not app_key like SDK endpoints)
2. **Returns all statuses**: Includes "Running", "Stopped", "Draft" parameters
3. **Returns expired parameters**: No expiry_dttm filtering
4. **No pagination**: Returns complete dataset in single response
5. **Used in parameters calculated**: Additional field added to conditions
6. **Condition parsing**: Adds parsed condition object to response
7. **Empty arrays valid**: New apps return empty arrays (not error)
8. **Read-only**: No side effects, safe to call repeatedly
9. **Caching recommended**: Response changes infrequently
10. **All fields included**: Complete parameter/condition documents returned
11. **Database operations**: Full collection scans for every request
12. **Performance**: Reasonable for `<1000` parameters

## Last Updated

February 2026
