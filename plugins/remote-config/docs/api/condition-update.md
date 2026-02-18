---
sidebar_label: "Condition Update"
---

# /i/remote-config/update-condition

## Overview

Updates an existing targeting condition. Changes affect all parameters using this condition globally. Condition updates are tracked with audit logging showing before/after query definitions.

---

## Endpoint


```plaintext
/i/remote-config/update-condition
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
| `condition_id` | String | Yes | MongoDB ObjectId of condition to update |
| `condition_name` | String | No | New condition name |
| `condition_definition` | String | No | New MongoDB-style query JSON string |
| `condition_color` | Integer | No | New UI color index (0-8) |
| `seed_value` | String | No | Parameter key for consistent distribution |
| `dry_run` | Boolean | No | Validate without saving |

### Global Impact Warning

Changes to condition_definition:
- Immediately affect SDK responses for ALL parameters using this condition
- No gradual rollout: All clients get updated logic immediately
- Existing user segments may change conditions
- Recommended: Test thoroughly before updating active conditions

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `server._id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.conditions.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

#### Success Response - Condition Updated
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "result": 200,
  "condition_name": "iOS Users",
  "message": "Condition successfully updated",
  "affected_parameters": ["button_color", "feature_flag"],
  "changes": {
    "condition_definition": {
      "before": "{\"up._os\":{\"$eq\":\"iOS\"}}",
      "after": "{\"up._os\":{\"$in\":[\"iOS\",\"iPadOS\"]}}"
    }
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

### Example 1: Update condition query definition

**Description**: Expand iOS condition to include iPadOS

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/update-condition" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "condition_id": "60d5ec20e6f1c72b4c8b4560",
    "condition_definition": "{\"up._os\":{\"$in\":[\"iOS\",\"iPadOS\"]}}"
  }
```

**Response** (200):
```json
{
  "result": 200,
  "condition_name": "iOS Users",
  "message": "Condition successfully updated",
  "affected_parameters": ["button_color", "feature_flag"],
  "changes": {
    "condition_definition": {
      "before": "{\"up._os\":{\"$eq\":\"iOS\"}}",
      "after": "{\"up._os\":{\"$in\":[\"iOS\",\"iPadOS\"]}}"
    }
  }
}
```

Note: Changes immediately affect button_color and feature_flag parameters.

### Example 2: Update condition name and color

**Description**: Rename condition and change its UI color

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/update-condition" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "condition_id": "60d5ec25e6f1c72b4c8b4561",
    "condition_name": "Apple Devices (iOS + iPadOS)",
    "condition_color": 3
  }
```

**Response** (200):
```json
{
  "result": 200,
  "condition_name": "Apple Devices (iOS + iPadOS)",
  "message": "Condition successfully updated",
  "affected_parameters": ["button_color"],
  "changes": {
    "condition_name": {
      "before": "iOS Users",
      "after": "Apple Devices (iOS + iPadOS)"
    },
    "condition_color": {
      "before": 1,
      "after": 3
    }
  }
}
```

### Example 3: Update seed value for consistent distribution

**Description**: Change seed parameter for A/B test consistency

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/update-condition" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "condition_id": "60d5ec2ae6f1c72b4c8b4562",
    "seed_value": "new_feature_key"
  }
```

**Response** (200):
```json
{
  "result": 200,
  "condition_name": "Early Adopters",
  "message": "Condition successfully updated",
  "affected_parameters": ["feature_flag"],
  "changes": {
    "seed_value": {
      "before": "old_feature_key",
      "after": "new_feature_key"
    }
  }
}
```

---

## Behavior/Processing

### Update Process

1. **Find** condition by condition_id
2. **Load** list of parameters using this condition
3. **Validate** new values (name, query, color)
4. **Parse** new condition_definition if provided
5. **Validate** using Drill feature query preprocessor
6. **Compare** old and new values
7. **Update** changed fields
8. **Update** condition field (auto-synced from definition)
9. **Log** changes with before/after values
10. **Immediate effect**: Changes apply to all using parameters

### Preserved Fields

CANNOT be changed:
- **c**: Usage counter (read-only)
- **created_dttm**: Original creation timestamp
- **created_user**: Creator information
- **used_in_parameters**: Managed separately via parameter operations

### Partial Updates Supported

Update only what changed:
```json
{
  "condition_color": 2
}
```
Leaves name, definition, and seed_value unchanged.

---

## Technical Notes

### Database Operations

**Update Operations**:
- **`remoteconfig_conditions{app_id}`**: Updates condition document
- **System logs**: Records all changes with before/after values

**Updated Document**:
```javascript
{
  "_id": ObjectId(),
  "condition_name": "iOS Users",
  "condition_definition": "{\"up._os\":{\"$in\":[\"iOS\",\"iPadOS\"]}}",
  "condition": {"up._os": {"$in": ["iOS", "iPadOS"]}},
  "condition_color": 1,
  "seed_value": "button_color",
  "c": 825,
  "used_in_parameters": ["button_color", "feature_flag"],
  "created_dttm": 1609459200000,
  "created_user": "original_creator@example.com"
}
```

### Condition Definition Auto-Sync

When `condition_definition` (JSON string) is updated:
- System automatically parses it to `condition` (JSON object)
- Both fields kept in sync
- Ensures consistency for SDK evaluation

### Global Impact Notification

Response includes:
- `affected_parameters`: List of parameters using this condition
- Warns operators of global scope change
- Each affected parameter now uses new condition logic

### Changes Tracking

Shows only fields modified:
- Before/after values included
- Null values shown if field cleared
- No changes field if dry_run mode

---

## Related Endpoints

- [Create Condition](./condition-add.md) - Create new condition
- [Remove Condition](./condition-remove.md) - Delete condition
- [Update Parameter](./parameter-update.md) - Modify parameter
- [Dashboard Get All](./o-remote-config.md) - View all conditions

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - condition updated | Returns change summary with affected parameters |
| `400` | condition_id not found | Condition does not exist error |
| `400` | condition_name invalid format | Regex validation error |
| `400` | condition_name already exists | Duplicate name error |
| `400` | condition_definition invalid JSON | JSON parse error |
| `400` | Invalid query operators | Drill feature validation error |
| `400` | No update fields provided | At least one field required |
| `401` | Invalid API key | Authentication failure |
| `402` | Missing COUNTLY_EE license | Enterprise feature error |
| `403` | API key lacks admin permission | Authorization error |

---

## Implementation Notes

1. **Requires admin access**: Only API keys with admin role can update
2. **Requires EE license**: Feature only available with COUNTLY_EE
3. **Partial updates supported**: Update only what changed
4. **Global scope changes**: Affects all parameters using this condition
5. **Immediate effect**: No gradual rollout for changes
6. **Drill feature validation**: Query syntax validated by Drill feature
7. **Auto-sync definition/condition**: Both fields kept synchronized
8. **Usage counter protected**: c field never modified
9. **Creator preserved**: created_user field never changed
10. **Affected parameters listed**: Response shows impact scope
11. **Dry-run validation**: Test changes without applying
12. **Audit trail**: All changes recorded in system logs

## Last Updated

February 2026
