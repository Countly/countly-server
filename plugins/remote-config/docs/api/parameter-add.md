---
sidebar_label: "Parameter Create"
---

# /i/remote-config/add-parameter

## Overview

Creates a new remote config parameter that can be returned to SDKs. Parameters define configuration values that can be conditionally assigned based on user targeting conditions.

---

## Endpoint


```plaintext
/i/remote-config/add-parameter
```

## Authentication

- **Required**: API key with admin access AND `COUNTLY_EE` license
- **HTTP Method**: POST
- **Content-Type**: `application/json`

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with admin permissions |
| `app_id` | String | Yes | Application ID |
| `parameter_key` | String | Yes | Parameter identifier (regex: `/^[a-zA-Z0-9_\-\.]+$/`) |
| `default_value` | String | Yes | Default value when no conditions match |
| `description` | String | No | User-friendly description |
| `dry_run` | Boolean | No | Validate without saving (false by default) |

### Parameter Validation

**parameter_key** Requirements:
- Must match regex: `/^[a-zA-Z0-9_\-\.]+$/`
- 3-255 characters
- Alphanumeric, underscore, hyphen, dot only
- Examples: `button_color`, `max_items`, `feature.enabled`

**default_value** Requirements:
- Required (cannot be null)
- No length limit
- Returned when no conditions match

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `remote-config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.condition.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.parameters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

#### Success Response - Parameter Created
**Status Code**: `201 Created`

**Body**:
### Success Response

```json
{
  "result": 201,
  "parameter_key": "button_color",
  "message": "Parameter successfully added",
  "parameter_id": "60d5ec49e6f1c72b4c8b4567"
}
```

#### Validation Error Response
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "result": 400,
  "errors": {
    "parameter_key": "must match /^[a-zA-Z0-9_\-\.]+$/"
  }
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

- Required: API key with admin access AND COUNTLY_EE license

## Examples

### Example 1: Create simple string parameter

**Description**: Create button color parameter with default value #FF5733

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/add-parameter" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "parameter_key": "button_color",
    "default_value": "#FF5733",
    "description": "Primary button color for UI"
  }
```

**Response** (201):
```json
{
  "result": 201,
  "parameter_key": "button_color",
  "message": "Parameter successfully added",
  "parameter_id": "60d5ec49e6f1c72b4c8b4567"
}
```

### Example 2: Create numeric parameter with description

**Description**: Create max_items parameter for pagination limit

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/add-parameter" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "parameter_key": "max_items",
    "default_value": "25",
    "description": "Maximum items per page"
  }
```

**Response** (201):
```json
{
  "result": 201,
  "parameter_key": "max_items",
  "message": "Parameter successfully added",
  "parameter_id": "60d5ec50e6f1c72b4c8b4568"
}
```

### Example 3: Validation dry-run (validate without saving)

**Description**: Check if parameter can be created without actual creation

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/add-parameter" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "parameter_key": "@invalid!key",
    "default_value": "value",
    "dry_run": true
  }
```

**Response** (400):
```json
{
  "result": 400,
  "errors": {
    "parameter_key": "must match /^[a-zA-Z0-9_\\-\\.]+$/"
  }
}
```

---

## Behavior/Processing

### Parameter Creation Process

1. **Validate** parameter_key against regex pattern
2. **Check** if parameter_key already exists (prevents duplicates)
3. **Validate** default_value is provided (required)
4. **Create** new document in `remoteconfig_parameters{app_id}` collection
5. **Return** 201 with parameter_id

### Default Values

- Any string accepted as default_value
- JSON strings supported (e.g., `"{\"key\":\"value\"}"`)
- Returned when no matching conditions exist
- Never null (required field)

### Duplicate Prevention

- If parameter_key already exists, returns 400 error
- Case-sensitive: `color` and `Color` are different parameters
- Prevents accidental overwrites

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `remoteconfig_parameters{app_id}` | Remote config domain | Stores remote-config parameters, conditions, and related metadata. |
| `status` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `conditions` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `c` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `created_dttm` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `created_user` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Update Parameter](./parameter-update.md) - Modify parameter details
- [Remove Parameter](./parameter-remove.md) - Delete parameter
- [Add Condition](./condition-add.md) - Create targeting condition
- [Dashboard Get All](./o-remote-config.md) - View all parameters

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `201` | Success | Parameter created, returns parameter_id |
| `400` | parameter_key invalid format | Regex validation error message |
| `400` | parameter_key already exists | Duplicate parameter error |
| `400` | Missing parameter_key | Required field error |
| `400` | Missing default_value | Required field error |
| `401` | Invalid API key | Authentication failure |
| `402` | Missing COUNTLY_EE license | Enterprise feature error |
| `403` | API key lacks admin permission | Authorization error |

---

## Implementation Notes

1. **Requires admin access**: Only API keys with admin role can create parameters
2. **Requires EE license**: Feature only available with COUNTLY_EE
3. **Automatic status**: New parameters always start in "Running" status
4. **Conditions separate**: Add conditions after parameter creation
5. **Case-sensitive keys**: `color` and `Color` are different parameters
6. **No spaces in key**: Use underscore or hyphen for multi-word keys
7. **Dot notation supported**: Keys like `feature.enabled` allowed
8. **Usage counter**: Starts at 0, incremented by SDK fetches
9. **Timestamps in milliseconds**: Use millisecond precision
10. **Expires field optional**: All new parameters have expiry_dttm: null
11. **Description optional**: Add helpful context for dashboard users
12. **Dry-run validation**: Use dry_run: true to validate without creating

## Last Updated

February 2026
