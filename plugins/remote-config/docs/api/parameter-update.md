---
sidebar_label: "Parameter Update"
---

# /i/remote-config/update-parameter

## Overview

Updates an existing remote config parameter. Supports partial updates including parameter key, default value, and description. Changes are tracked with audit logging showing before/after values.

---

## Endpoint


```plaintext
/i/remote-config/update-parameter
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
| `parameter_id` | String | Yes | MongoDB ObjectId of parameter to update |
| `parameter_key` | String | No | New parameter key (if renaming) |
| `default_value` | String | No | New default value |
| `description` | String | No | New description |
| `dry_run` | Boolean | No | Validate without saving (false by default) |

### Partial Updates

All fields except `parameter_id` are optional:
- Omit fields to leave them unchanged
- Provide only fields you want to update
- At least one update field required

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `remote-config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

#### Success Response - Parameter Updated
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "result": 200,
  "parameter_key": "button_color",
  "message": "Parameter successfully updated",
  "changes": {
    "default_value": {
      "before": "#FF5733",
      "after": "#00FF00"
    }
  }
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


## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.hooks` | Webhook/integration definitions | Stores hook configuration and state used by this endpoint. |

## Examples

### Example 1: Update default value only

**Description**: Change button color from red to green

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/update-parameter" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "parameter_id": "60d5ec49e6f1c72b4c8b4567",
    "default_value": "#00FF00"
  }
```

**Response** (200):
```json
{
  "result": 200,
  "parameter_key": "button_color",
  "message": "Parameter successfully updated",
  "changes": {
    "default_value": {
      "before": "#FF5733",
      "after": "#00FF00"
    }
  }
}
```

### Example 2: Update description and default value

**Description**: Improve documentation and adjust pagination limit

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/update-parameter" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "parameter_id": "60d5ec50e6f1c72b4c8b4568",
    "default_value": "50",
    "description": "Maximum items per page (increased from 25)"
  }
```

**Response** (200):
```json
{
  "result": 200,
  "parameter_key": "max_items",
  "message": "Parameter successfully updated",
  "changes": {
    "default_value": {
      "before": "25",
      "after": "50"
    },
    "description": {
      "before": "Maximum items per page",
      "after": "Maximum items per page (increased from 25)"
    }
  }
}
```

### Example 3: Rename parameter key

**Description**: Rename parameter from old_key to new_key

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/update-parameter" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "parameter_id": "60d5ec55e6f1c72b4c8b456a",
    "parameter_key": "new_parameter_key"
  }
```

**Response** (200):
```json
{
  "result": 200,
  "parameter_key": "new_parameter_key",
  "message": "Parameter successfully updated",
  "changes": {
    "parameter_key": {
      "before": "old_parameter_key",
      "after": "new_parameter_key"
    }
  }
}
```

---

## Behavior/Processing

### Update Process

1. **Find** parameter by parameter_id
2. **Validate** new values (keys, formats, duplicates)
3. **Compare** old and new values
4. **Update** only changed fields
5. **Preserve** system fields (created_dttm, conditions, status, usage counter)
6. **Log** changes with before/after values
7. **Return** 200 with change summary

### Preserved Fields

These fields CANNOT be changed:
- **c**: Usage counter (read-only, incremented by SDK calls)
- **conditions**: Use condition endpoints to modify
- **status**: Cannot be changed directly via this endpoint
- **created_dttm**: Original creation timestamp preserved
- **created_user**: Creator information preserved

### Partial Updates

Example: Update only description, leave default_value unchanged
```json
{
  "api_key": "KEY",
  "app_id": "APP_ID",
  "parameter_id": "PARAM_ID",
  "description": "New description only"
}
```

The default_value, parameter_key, and status remain unchanged.

---

## Technical Notes

### Database Operations

**Update Operation**:
- **`remoteconfig_parameters{app_id}`**: Updates single document by _id
- **`remoteconfig_audit_logs{app_id}`**: Writes audit entry (optional)

**Updated Document**:
```javascript
{
  // Unchanged fields
  "_id": ObjectId(),
  "conditions": [...],
  "c": 1523,
  "created_dttm": 1609459200000,
  "created_user": "original_creator@example.com",
  
  // Potentially updated fields
  "parameter_key": "button_color",
  "default_value": "#00FF00",
  "description": "Updated description",
  "status": "Running"
}
```

### Change Tracking

Changes returned in response:
- Shows only fields that were modified
- Includes before/after values
- Null values included if field was cleared
- No changes field if only validation (dry_run)

### Validation Rules

**parameter_key**: If provided, must:
- Match regex: `/^[a-zA-Z0-9_\-\.]+$/`
- Not already exist (duplicate check)
- Be 3-255 characters

**default_value**: If provided, must:
- Be non-empty string
- No length limit
- JSON string format supported

---

## Related Endpoints

- [Create Parameter](./parameter-add.md) - Create new parameter
- [Remove Parameter](./parameter-remove.md) - Delete parameter
- [Add Condition](./condition-add.md) - Create targeting condition
- [Dashboard Get All](./o-remote-config.md) - View all parameters

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - parameter updated | Returns change summary |
| `400` | parameter_id not found | Parameter does not exist error |
| `400` | parameter_key invalid format | Regex validation error |
| `400` | parameter_key already exists | Duplicate parameter error |
| `400` | No update fields provided | At least one field required error |
| `401` | Invalid API key | Authentication failure |
| `402` | Missing COUNTLY_EE license | Enterprise feature error |
| `403` | API key lacks admin permission | Authorization error |

---

## Implementation Notes

1. **Requires admin access**: Only API keys with admin role can update
2. **Requires EE license**: Feature only available with COUNTLY_EE
3. **Partial updates supported**: Update only what changed
4. **Usage counter protected**: c field never modified by update
5. **Conditions unchanged**: Use condition endpoints to modify targets
6. **Audit logging**: All changes recorded with before/after values
7. **At least one field**: Must provide at least one update parameter
8. **Timestamp preservation**: created_dttm never updated
9. **Creator preserved**: created_user field never changed
10. **Status immutable**: Cannot directly change status via this endpoint
11. **Changes tracked**: Response includes what was modified
12. **Dry-run available**: Validate changes without saving

## Last Updated

February 2026
