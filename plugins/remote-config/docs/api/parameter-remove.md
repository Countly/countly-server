---
sidebar_label: "Parameter Delete"
---

# /i/remote-config/remove-parameter

## Overview

Permanently deletes a remote config parameter from the application configuration. Deletion is irreversible and records the deleted parameter in system logs for audit purposes.

---

## Endpoint


```plaintext
/i/remote-config/remove-parameter
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
| `parameter_id` | String | Yes | MongoDB ObjectId of parameter to delete |
| `dry_run` | Boolean | No | Validate without deleting (false by default) |

### Immutable Deletion

Deletion is irreversible:
- Parameter removed from collection
- All historical association data maintained
- Cannot be recovered via API (requires database restore)

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `remote-config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

#### Success Response - Parameter Deleted
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "result": 200,
  "parameter_key": "button_color",
  "message": "Parameter successfully removed",
  "deleted_conditions_count": 0
}
```

#### Not Found Response
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "result": 400,
  "error": "Parameter not found",
  "parameter_id": "60d5ec49e6f1c72b4c8b4567"
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

### Example 1: Delete unused parameter

**Description**: Remove test parameter that's no longer needed

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/remove-parameter" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "parameter_id": "60d5ec49e6f1c72b4c8b4567"
  }
```

**Response** (200):
```json
{
  "result": 200,
  "parameter_key": "button_color",
  "message": "Parameter successfully removed",
  "deleted_conditions_count": 0
}
```

### Example 2: Delete parameter with conditions

**Description**: Remove parameter that had multiple targeting conditions

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/remove-parameter" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "parameter_id": "60d5ec50e6f1c72b4c8b4568"
  }
```

**Response** (200):
```json
{
  "result": 200,
  "parameter_key": "max_items",
  "message": "Parameter successfully removed",
  "deleted_conditions_count": 0
}
```

Note: Condition references are removed from conditions' `used_in_parameters` arrays, not conditions themselves.

### Example 3: Validation dry-run before deletion

**Description**: Verify parameter exists and would be deletable

**Request**:
```bash
curl -X POST "https://your-server.com/i/remote-config/remove-parameter" \
  -H "Content-Type: application/json" \
  -d {
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439011",
    "parameter_id": "60d5ec49e6f1c72b4c8b4567",
    "dry_run": true
  }
```

**Response** (200):
```json
{
  "result": 200,
  "parameter_key": "button_color",
  "message": "Parameter would be removed",
  "deleted_conditions_count": 0
}
```

Parameter is NOT actually deleted when dry_run: true.

---

## Behavior/Processing

### Deletion Process

1. **Find** parameter by parameter_id
2. **Load** full parameter document including condition references
3. **Update** conditions** to remove parameter from `used_in_parameters` arrays
4. **Delete** parameter document from `remoteconfig_parameters{app_id}`
5. **Log** deletion with full parameter details for audit
6. **Return** 200 with success message

### Condition Cleanup

When a parameter is deleted:
- All conditions referencing it have that parameter removed from `used_in_parameters`
- Conditions themselves are NOT deleted
- Other parameters using same conditions unaffected
- Each condition's usage count decremented

Example:
```javascript
// Before deletion of "max_items"
{
  "_id": "60d5ec20e6f1c72b4c8b4560",
  "condition_name": "iOS Users",
  "used_in_parameters": ["max_items", "button_color"]
}

// After deletion
{
  "_id": "60d5ec20e6f1c72b4c8b4560",
  "condition_name": "iOS Users",
  "used_in_parameters": ["button_color"]
}
```

### Recovery Options

**Accidental Deletion**:
- API provides no restore function
- Database administrator can restore from backups
- Recommended: Use dry_run: true before actual deletion
- Best practice: Disable instead of delete for critical parameters

---

## Technical Notes

### Database Operations

**Delete Operations**:
- **`remoteconfig_parameters{app_id}`**: Removes document by _id
- **`remoteconfig_conditions{app_id}`**: Removes parameter from `used_in_parameters` array
- **System logs**: Records deletion with full parameter details

**Deletion Query**:
```javascript
db.collection('remoteconfig_parameters' + app_id).deleteOne({
  _id: ObjectId(parameter_id)
})
```

**Condition Update Query**:
```javascript
db.collection('remoteconfig_conditions' + app_id).updateMany(
  { used_in_parameters: parameter_key },
  { $pull: { used_in_parameters: parameter_key } }
)
```

### Cascading Behavior

- **Cascade type**: Passive (no automatic effects beyond condition cleanup)
- **Other parameters**: Unaffected
- **Conditions**: Updated to remove reference, not deleted
- **SDK responses**: Parameter no longer returned to clients

### Audit Trail

System logs deletion with:
- Deleted parameter key and ID
- Deleted default value
- All conditions it was targeting
- Timestamp of deletion
- User who performed deletion

---

## Related Endpoints

- [Create Parameter](./parameter-add.md) - Create new parameter
- [Update Parameter](./parameter-update.md) - Modify parameter
- [Add Condition](./condition-add.md) - Create targeting condition
- [Dashboard Get All](./o-remote-config.md) - View all parameters

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - parameter deleted | Deletion complete with count |
| `400` | parameter_id not found | Parameter does not exist error |
| `400` | Invalid parameter_id format | ObjectId validation error |
| `401` | Invalid API key | Authentication failure |
| `402` | Missing COUNTLY_EE license | Enterprise feature error |
| `403` | API key lacks admin permission | Authorization error |

---

## Implementation Notes

1. **Requires admin access**: Only API keys with admin role can delete
2. **Requires EE license**: Feature only available with COUNTLY_EE
3. **Irreversible operation**: Deletion cannot be undone via API
4. **Condition references removed**: Conditions updated, not deleted
5. **Audit logging enabled**: All deletions recorded in system logs
6. **Dry-run verification**: Use dry_run: true before actual deletion
7. **No cascade delete**: Only removes parameter document
8. **Conditions preserved**: Condition documents survive parameter deletion
9. **Other parameters safe**: Deletion affects only target parameter
10. **SDK responses change**: Parameter no longer returned to clients
11. **Usage counter lost**: Parameter fetch statistics deleted
12. **Recovery requires backup**: Database restore needed if accidental deletion

## Last Updated

February 2026
