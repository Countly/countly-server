---
sidebar_label: "Condition Delete"
---

# /i/remote-config/remove-condition

## Overview

Permanently deletes a targeting condition and automatically removes it from all parameters that reference it. Deletion is irreversible and cascades to clean up all parameter associations.

---

## Endpoint


```plaintext
/i/remote-config/remove-condition
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
| `condition_id` | String | Yes | MongoDB ObjectId of condition to delete |
| `dry_run` | Boolean | No | Validate without deleting |

### Cascading Deletion

Removes condition from ALL parameters:
- Condition document deleted from collection
- Parameter documents updated to remove condition references
- Atomicity checks ensure consistency
- Cannot be recovered via API (requires database restore)

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `server._id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.conditions.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

#### Success Response - Condition Deleted
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "result": 200,
  "condition_name": "iOS Users",
  "message": "Condition successfully removed",
  "affected_parameters": ["button_color", "feature_flag"],
  "affected_parameters_count": 2
}
```

#### Not Found Response
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "result": 400,
  "error": "Condition not found",
  "condition_id": "60d5ec20e6f1c72b4c8b4560"
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

### Example 1: Delete unused condition

**Description**: Remove test condition not used by any parameters

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/remove-condition" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "condition_id": "60d5ec20e6f1c72b4c8b4560"
  }
```

**Response** (200):
```json
{
  "result": 200,
  "condition_name": "iOS Users",
  "message": "Condition successfully removed",
  "affected_parameters": [],
  "affected_parameters_count": 0
}
```

### Example 2: Delete condition used by multiple parameters

**Description**: Remove condition that targets 3 parameters

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/remove-condition" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "condition_id": "60d5ec25e6f1c72b4c8b4561"
  }
```

**Response** (200):
```json
{
  "result": 200,
  "condition_name": "Premium US/CA Users",
  "message": "Condition successfully removed",
  "affected_parameters": ["button_color", "feature_flag", "max_items"],
  "affected_parameters_count": 3
}
```

The condition is removed from conditions array in all 3 parameters.

### Example 3: Validation dry-run before deletion

**Description**: Verify condition exists and see what would be affected

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/remove-condition" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "condition_id": "60d5ec2ae6f1c72b4c8b4562",
    "dry_run": true
  }
```

**Response** (200):
```json
{
  "result": 200,
  "condition_name": "Early Adopters",
  "message": "Condition would be removed",
  "affected_parameters": ["button_color"],
  "affected_parameters_count": 1
}
```

Condition is NOT deleted when dry_run: true.

---

## Behavior/Processing

### Deletion Process

1. **Find** condition by condition_id
2. **Load** list of parameters using this condition
3. **Begin** atomic transaction for consistency
4. **Remove** condition from each parameter's conditions array
5. **Delete** condition document from `remoteconfig_conditions{app_id}`
6. **Commit** transaction ensuring all-or-nothing atomicity
7. **Log** deletion with affected parameters list
8. **Return** 200 with cascade details

### Parameter Cleanup

When condition deleted:
- Each parameter's `conditions` array has condition removed
- Parameter values for that condition become unreachable
- Default value used instead (since condition no longer matches)
- SDK responses change for parameters using this condition

Example parameter before deletion:
```javascript
{
  "_id": "60d5ec49e6f1c72b4c8b4567",
  "parameter_key": "button_color",
  "default_value": "#FF5733",
  "conditions": [
    {
      "condition_id": "60d5ec20e6f1c72b4c8b4560",
      "condition_value": "#00FF00"
    }
  ]
}
```

After deletion of condition_id `60d5ec20e6f1c72b4c8b4560`:
```javascript
{
  "_id": "60d5ec49e6f1c72b4c8b4567",
  "parameter_key": "button_color",
  "default_value": "#FF5733",
  "conditions": []
}
```

Parameter now returns only default value.

### SDK Response Changes

- Parameters lose conditional targeting for this condition
- Clients always receive default value
- No partial errors: All parameters updated atomically

### Recovery Options

**Accidental Deletion**:
- API provides no restore function
- Database administrator can restore from backups
- Recommended: Use dry_run: true before actual deletion
- Best practice: Disable instead of delete for important conditions

---

## Technical Notes

### Database Operations

**Delete Operations**:
- **`remoteconfig_conditions{app_id}`**: Removes condition document
- **`remoteconfig_parameters{app_id}`**: Removes condition from conditions array
- **Atomicity**: Transaction ensures all-or-nothing deletion

**Deletion Query**:
```javascript
db.collection('remoteconfig_conditions' + app_id).deleteOne({
  _id: ObjectId(condition_id)
})
```

**Cascade Update Query**:
```javascript
db.collection('remoteconfig_parameters' + app_id).updateMany(
  { "conditions.condition_id": ObjectId(condition_id) },
  { $pull: { conditions: { condition_id: ObjectId(condition_id) } } }
)
```

### Cascading Behavior

- **Cascade type**: Aggressive (removes condition from all parameters)
- **Other conditions**: Unaffected in same parameters
- **Atomicity checks**: Ensures consistency across all updates
- **No partial deletions**: All-or-nothing transaction

### Audit Trail

System logs deletion with:
- Deleted condition name and ID
- List of parameters affected
- Before/after condition count per parameter
- Timestamp of deletion
- User who performed deletion

### Impact on SDK Responses

Before deletion:
```json
{
  "button_color": "#00FF00"  // conditional value from deleted condition
}
```

After deletion:
```json
{
  "button_color": "#FF5733"  // default value (condition no longer matches)
}
```

---

## Related Endpoints

- [Create Condition](./condition-add.md) - Create new condition
- [Update Condition](./condition-update.md) - Modify condition
- [Create Parameter](./parameter-add.md) - Create parameter
- [Dashboard Get All](./o-remote-config.md) - View all conditions

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - condition deleted | Deletion complete with affected parameters |
| `400` | condition_id not found | Condition does not exist error |
| `400` | Invalid condition_id format | ObjectId validation error |
| `401` | Invalid API key | Authentication failure |
| `402` | Missing COUNTLY_EE license | Enterprise feature error |
| `403` | API key lacks admin permission | Authorization error |

---

## Implementation Notes

1. **Requires admin access**: Only API keys with admin role can delete
2. **Requires EE license**: Feature only available with COUNTLY_EE
3. **Cascading deletion**: Removes condition from all parameters
4. **Irreversible operation**: Deletion cannot be undone via API
5. **Atomic transaction**: All-or-nothing consistency
6. **Parameters preserved**: Parameter documents themselves not deleted
7. **Condition references removed**: Only condition removed from parameters
8. **Audit logging enabled**: All deletions recorded
9. **Dry-run verification**: Use dry_run: true before actual deletion
10. **SDK impact immediate**: Clients get default values immediately
11. **Usage counter lost**: Condition fetch statistics deleted
12. **Recovery requires backup**: Database restore needed if accidental deletion

## Last Updated

February 2026
