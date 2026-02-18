---
sidebar_label: "Save Config"
---

# /o?method=config-upload

## Overview

Upload and save SDK configuration for an application. Allows administrators to update SDK settings including feature flags, queue sizes, batch settings, and other behavioral parameters. Validates configuration format and filters invalid options before saving.

---

## Endpoint


```plaintext
/o?method=config-upload
```

## Authentication

- **Required**: API key with update permission
- **HTTP Method**: POST recommended
- **Permission**: Update access to SDK feature

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with update permissions |
| `app_id` | String | Yes | Application ID |
| `method` | String | Yes | Must be "config-upload" |
| `config` | String or Object | Yes | Configuration object (JSON or parsed) |

### config Parameter

Can be provided as:
1. **JSON string**: `{"tracking":true,"crt":true,...}`
2. **Parsed object**: Direct JavaScript object
3. **Wrapped format**: `{c: {tracking: true, ...}}`

```json
{
  "tracking": true,
  "networking": true,
  "crt": true,
  "vt": true,
  "st": true,
  "bom": true,
  "bom_at": 10,
  "bom_rqp": 50,
  "bom_ra": 24,
  "bom_d": 60
}
```

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `server._id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.c.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.t.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.v.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

#### Success Response - Configuration Saved
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{"result": "Success"}
```

#### Validation Error - Invalid Format
**Status Code**: `200 OK`

**Body**:
```json
{"result": 400, "message": "Invalid config format"}
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

- Required: API key with update permission


## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.sdks` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly_out.sdk_configs` | Remote config domain | Stores remote-config parameters, conditions, and related metadata. |
| `countly_out.sdk_enforcement` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

## Examples

### Example 1: Upload configuration as JSON string

**Description**: Save configuration provided as JSON string

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o?method=config-upload" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'config={"tracking":true,"crt":true,"vt":true,"bom":true,"bom_at":10,"bom_rqp":50}'
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 2: Upload with wrapped format

**Description**: Save using standard SDK response format

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o?method=config-upload" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'config={"c":{"tracking":true,"crt":true,"vt":true,"bom":true}}'
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 3: Upload with comprehensive settings

**Description**: Full configuration with all batch settings

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o?method=config-upload" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'config={"tracking":true,"networking":true,"crt":true,"vt":true,"st":true,"cet":true,"ecz":true,"cr":false,"sui":true,"eqs":100,"rqs":50,"czi":true,"dort":true,"scui":true,"lkl":100,"lvs":200,"lsv":true,"lbc":true,"ltlpt":true,"ltl":true,"lt":true,"rcz":true,"bom":true,"bom_at":15,"bom_rqp":75,"bom_ra":30,"bom_d":120}'
```

**Response** (200):
```json
{"result": "Success"}
```

---

## Behavior/Processing

### Configuration Upload Process

1. **Parse** request parameters
2. **Check** update permission for SDK feature
3. **Validate** config parameter:
   - Accepts JSON string or object
   - Parse if string provided
4. **Extract** configuration:
   - If wrapped in `c` field, use inner object
   - Otherwise use config directly
5. **Filter** invalid options:
   - Remove any keys not in validOptions list
   - Keep only recognized SDK parameters
6. **Save** to database:
   - Upsert into `sdk_configs` collection
   - Set `config` field
7. **Return** success response

### Configuration Validation

**Valid options verified**:
```javascript
const validOptions = [
  "tracking", "networking", "crt", "vt", "st", "cet",
  "ecz", "cr", "sui", "eqs", "rqs", "czi", "dort",
  "scui", "lkl", "lvs", "lsv", "lbc", "ltlpt", "ltl",
  "lt", "rcz", "bom", "bom_at", "bom_rqp", "bom_ra",
  "bom_d", "upcl", "ew", "upw", "sw", "esw", "eb", "upb", "sb", "esb"
]
```

**Invalid options removed**:
- Any key not in validOptions is deleted
- No error returned for invalid keys
- Silently filtered during save

### Format Flexibility

**JSON string support**:
```javascript
if (typeof uploadConfig === "string") {
  uploadConfig = JSON.parse(uploadConfig);
}
```

**Wrapped format support**:
```javascript
var configToSave = uploadConfig.c || uploadConfig;
```

Allows both formats without client modification.

---

## Technical Notes

### Database Operations

**Write Operation**:
- **Collection**: `sdk_configs`
- **Query**: `{_id: app_id + ""}`
- **Update**: `{$set: {config: configToSave}}`
- **Options**: `{upsert: true}`
- **Effect**: Creates new or updates existing

**Upsert behavior**:
- If config doesn't exist: creates new document
- If config exists: replaces config field
- Preserves other fields if any exist

### Data Validation

**Type checking**:
```javascript
if (!uploadConfig || typeof uploadConfig !== "object") {
  return error: "Config must be a valid object"
}
```

**Format validation**:
- Must be valid JSON if string
- Must be object type
- Invalid JSON returns parse error

### Field Filtering

**Safety mechanism**:
```javascript
for (var key in configToSave) {
  if (validOptions.indexOf(key) === -1) {
    delete configToSave[key];
  }
}
```

No errors for invalid keys - silently removes them.

### Storage

**Field structure**:
```javascript
{
  "_id": "app_id",
  "config": {
    "tracking": true,
    "crt": true,
    ...
  }
}
```

---

## Related Endpoints

- [Get SDK Config (SDK)](./o-sdk-config.md) - Retrieve config (SDK uses this)
- [Get SDK Config (Admin)](./o-sdk-config-read.md) - View current config
- [Get Enforcement](./o-sdk-enforcement.md) - View enforcement rules
- [Update Parameter](./i-sdk-config-parameter.md) - Update single parameter

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | `{"result": "Success"}` |
| `200` | Invalid JSON format | `{"result": 400, "message": "Invalid config format"}` |
| `200` | Config not object | `{"result": 400, "message": "Config must be a valid object"}` |
| `500` | Database error | `{"result": 500, "message": "Error saving config..."}` |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **Flexible format**: Accepts JSON string or parsed object
2. **Wrapped support**: Handles SDK response format (c field)
3. **Silent filtering**: Invalid keys removed without error
4. **Upsert behavior**: Creates config if doesn't exist
5. **Replace strategy**: Entire config object replaced
6. **No merge**: New config completely replaces old
7. **Immediate effect**: Changes apply to next SDK request
8. **No versioning**: No history of config changes
9. **Permission required**: Update permission (not just read)
10. **Type safety**: Validates configuration is object
11. **Safe keys only**: Only valid SDK parameters stored
12. **Database direct**: Stored in sdk_configs collection

## Last Updated

February 2026
