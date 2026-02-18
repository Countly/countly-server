---
sidebar_label: "Update Parameter"
---

# /i/sdk-config/update-parameter

## Overview

Update a single SDK configuration parameter. Allows administrators to modify individual settings like batch size, queue limits, feature flags, or behavioral options without replacing the entire configuration. Parameter name and value are validated before saving.

---

## Endpoint


```plaintext
/i/sdk-config/update-parameter
```

## Authentication

- **Required**: API key with write/update permission
- **HTTP Method**: POST recommended
- **Permission**: Update access to SDK configuration
- **Request Type**: Form data or JSON

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with update permissions |
| `app_id` | String | Yes | Application ID |
| `name` | String | Yes | Parameter name (e.g., "tracking", "bom_rqp") |
| `value` | Any | Yes | New parameter value (type varies by parameter) |

### Parameter Validation

**Valid parameter names** (40+ options):
- Feature tracking: `tracking`, `networking`, `crt`, `vt`, `st`
- Feature compression: `ecz`, `rcz`, `czi`
- Event handling: `cet`, `eqs`, `rqs`, `sb`, `eb`, `esb`
- User properties: `upw`, `upb`, `upcl`
- Location: `lkl`, `lvs`, `lsv`, `lbc`, `ltlpt`, `ltl`, `lt`
- BOM settings: `bom`, `bom_at`, `bom_rqp`, `bom_ra`, `bom_d`
- Other: `cr`, `sui`, `dort`, `scui`, `sw`, `ew`

## Response

#### Success Response - Parameter Updated
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{"result": "Success"}
```

#### Validation Error - Invalid Parameter
**Status Code**: `200 OK`

**Body**:
```json
{"result": 400, "message": "Invalid parameter name"}
```

#### Validation Error - Invalid Value
**Status Code**: `200 OK`

**Body**:
```json
{"result": 400, "message": "Invalid parameter value"}
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

- Required: API key with write/update permission


## Database Collections

This endpoint does not read or write database collections.

## Examples

### Example 1: Enable crash reporting

**Description**: Update single flag parameter

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/sdk-config/update-parameter" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d "name=crt" \
  -d "value=true"
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 2: Update batch size parameter

**Description**: Update numeric parameter (event queue size)

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/sdk-config/update-parameter" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d "name=eqs" \
  -d "value=500"
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 3: Update batch reporting probability

**Description**: Update percentage parameter (0-100)

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/sdk-config/update-parameter" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d "name=bom_rqp" \
  -d "value=75"
```

**Response** (200):
```json
{"result": "Success"}
```

---

## Behavior/Processing

### Parameter Update Process

1. **Parse** request parameters
2. **Check** update permission
3. **Validate** parameter name:
   - Must be in validOptions list
   - Case-sensitive check
4. **Validate** parameter value:
   - Type checking (boolean, number, string)
   - Range validation if applicable
5. **Update** configuration:
   - Query existing config by app_id
   - Set single field: `config.{name} = value`
   - Upsert if config doesn't exist
6. **Return** success response

### Single Field Update

**Update mechanism using MongoDB $set**:
```javascript
var updateObj = {};
updateObj["config." + paramName] = paramValue;

db.sdk_configs.updateOne(
  {_id: app_id},
  {$set: updateObj},
  {upsert: true}
)
```

### Comparison: Full Replace vs Single Field

**This endpoint** (single field):
- Updates one parameter only
- Other config preserved
- Efficient delta update
- Recommended for incremental changes

**config-upload endpoint** (full replace):
- Replaces entire config object
- Old parameters removed
- Bulk configuration useful
- Better for complete resets

---

## Technical Notes

### Database Operations

**Write Operation**:
- **Collection**: `sdk_configs`
- **Query**: `{_id: app_id + ""}`
- **Update**: `{$set: {"config.{name}": value}}`
- **Options**: `{upsert: true}`

**Direct field update**:
```javascript
var updateObj = {};
updateObj["config." + paramName] = paramValue;
updateOne({_id: app_id}, {$set: updateObj}, {upsert: true});
```

**Upsert behavior**:
- If config doesn't exist: creates with single parameter
- If config exists: adds/updates parameter only
- Preserves all other parameters

### Parameter Type Handling

**Boolean parameters** (tracking, crt, networking, etc.):
```javascript
if (["tracking", "networking", "crt"].indexOf(name) !== -1) {
  value = value === true || value === "true";
}
```

**Numeric parameters** (eqs, rqs, bom_at, etc.):
```javascript
if (["eqs", "rqs", "bom_at", "bom_ra", "bom_d"].indexOf(name) !== -1) {
  value = parseInt(value);
}
```

### Field Storage

**Structure after update**:
```javascript
{
  "_id": "app_id",
  "config": {
    "tracking": true,      // kept from before
    "crt": true,           // newly updated
    "vt": true,            // kept from before
    "eqs": 500             // newly updated
  }
}
```

---

## Related Endpoints

- [Upload Config](./o-config-upload.md) - Replace entire configuration
- [Get SDK Config (SDK)](./o-sdk-config.md) - Retrieve current config
- [Get SDK Config (Admin)](./o-sdk-config-read.md) - View raw config
- [Update Enforcement](./i-sdk-config-enforcement.md) - Update enforcement rules

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | `{"result": "Success"}` |
| `200` | Parameter not recognized | `{"result": 400, "message": "Invalid parameter name"}` |
| `200` | Invalid value type | `{"result": 400, "message": "Invalid parameter value"}` |
| `200` | Parameter out of range | `{"result": 400, "message": "Value out of allowed range"}` |
| `500` | Database error | `{"result": 500, "message": "Database error..."}` |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **Single field update**: Only specified parameter changed
2. **Preserve others**: All other config parameters unchanged
3. **Whitelist validation**: Checks against validOptions array
4. **Type coercion**: Converts string values to appropriate types
5. **Upsert support**: Creates config if it doesn't exist
6. **Atomic update**: Single MongoDB operation
7. **Immediate effect**: Changes visible in next SDK request
8. **Delta efficiency**: Better than full config replace for small changes
9. **Parameter specific**: Validation rules per parameter type
10. **No versioning**: No history tracking
11. **Permission required**: Update/write permission needed
12. **Direct field path**: Uses MongoDB nested path notation

## Last Updated

February 2026
