---
sidebar_label: "Update Enforcement"
---

# /i/sdk-config/update-enforcement

## Overview

Update the server-side enforcement rules for an SDK application. Enforcement rules override SDK configuration parameters in real-time without requiring SDK updates. Allows disabling features (via `false` values) or overriding parameter values across all client SDKs. Critical for feature toggles, emergency patches, and compliance enforcement.

---

## Endpoint


```plaintext
/i/sdk-config/update-enforcement
```

## Authentication

- **Required**: API key with write/update permission
- **HTTP Method**: POST recommended
- **Permission**: Update access to SDK enforcement
- **Request Type**: Form data or JSON

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with update permissions |
| `app_id` | String | Yes | Application ID |
| `enforcement` | String or Object | Yes | Enforcement rules object (JSON or parsed) |

### enforcement Parameter

Can be provided as:
1. **JSON string**: `{"crt":false,"eqs":100,...}`
2. **Parsed object**: Direct JavaScript object
3. **Wrapped format**: `{c: {crt: false, ...}}`

```json
{
  "tracking": false,
  "crt": false,
  "vt": true,
  "eqs": 150,
  "bom_rqp": 50
}
```

**Field meanings**:
- `false`: Disable this feature/parameter (client SDK won't use it)
- `true`: Force enable or use this value
- Numeric: Override parameter with this value
- Omitted: Use configuration value instead

## Response

#### Success Response - Enforcement Updated
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
{"result": 400, "message": "Invalid enforcement format"}
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

### Example 1: Disable crash reporting feature

**Description**: Disable crash reporting for all SDKs of this app

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/sdk-config/update-enforcement" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'enforcement={"crt":false}'
```

**Response** (200):
```json
{"result": "Success"}
```

**Effect on SDK**: 
- When SDK requests config, `crt` parameter removed from response
- Crash reporting disabled across all client instances

### Example 2: Override queue sizes and disable a feature

**Description**: Reduce batch sizes and disable tracking

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/sdk-config/update-enforcement" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'enforcement={"tracking":false,"eqs":100,"rqs":50,"bom_rqp":25}'
```

**Response** (200):
```json
{"result": "Success"}
```

**Effect on SDK**:
- Tracking removed from config
- Event queue limited to 100
- Request queue limited to 50
- Batch reporting probability set to 25%

### Example 3: Comprehensive enforcement update

**Description**: Emergency lockdown - disable most features

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/sdk-config/update-enforcement" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'enforcement={"tracking":false,"crt":false,"vt":false,"st":false,"networking":false,"czi":false,"ecz":false,"rcz":false,"eqs":50,"rqs":25,"bom_rqp":10}'
```

**Response** (200):
```json
{"result": "Success"}
```

---

## Behavior/Processing

### Enforcement Update Process

1. **Parse** request parameters
2. **Check** update permission
3. **Validate** enforcement parameter:
   - Accepts JSON string or object
   - Parse if string provided
4. **Extract** enforcement:
   - If wrapped in `c` field, use inner object
   - Otherwise use enforcement directly
5. **Filter** invalid options:
   - Remove any keys not in validOptions list
   - Keep only recognized parameters
6. **Save** to database:
   - Upsert into `sdk_enforcement` collection
   - Replaces entire enforcement document
7. **Return** success response

### Feature Disabling Mechanism

**How false values work**:
```javascript
// In SDK config retrieval
if (enforcement[key] === false) {
  delete config[key];  // Feature completely removed
}
```

SDK won't receive parameter if enforcement is `false`.

### Parameter Override Mechanism

**How non-false values work**:
```javascript
// In SDK config retrieval
if (enforcement[key] !== false) {
  config[key] = enforcement[key];  // Override with enforcement value
}
```

SDK will use enforcement value instead of config value.

### Format Flexibility

**JSON string parsing**:
```javascript
if (typeof enforcement === "string") {
  enforcement = JSON.parse(enforcement);
}
```

**Wrapped format support**:
```javascript
var enforcementToSave = enforcement.c || enforcement;
```

---

## Technical Notes

### Database Operations

**Write Operation**:
- **Collection**: `sdk_enforcement`
- **Query**: `{_id: app_id + ""}`
- **Update**: `{$set: {entire enforcement object}}`
- **Options**: `{upsert: true}`
- **Effect**: Replaces entire enforcement document

**Upsert behavior**:
- If enforcement doesn't exist: creates new document
- If enforcement exists: replaces entire document
- All old enforcement rules are overwritten

### Field Filtering

**Validation mechanism**:
```javascript
for (var key in enforcementToSave) {
  if (validOptions.indexOf(key) === -1) {
    delete enforcementToSave[key];
  }
}
```

**Invalid keys removed**:
- Silently deleted (no error returned)
- Only recognized SDK parameters saved
- Safety mechanism to prevent storage of junk

### Storage Structure

**Enforcement document**:
```javascript
{
  "_id": "app_id",
  "tracking": false,
  "crt": false,
  "eqs": 100,
  "rqs": 50,
  "bom_rqp": 25
}
```

**Complete replacement**:
- Old enforcement completely replaced
- New enforcement has only specified fields
- Unspecified parameters revert to configuration

---

## Related Endpoints

- [Get Enforcement](./o-sdk-enforcement.md) - View current enforcement rules
- [Get SDK Config (SDK)](./o-sdk-config.md) - SDK config with enforcement applied
- [Upload Config](./o-config-upload.md) - Save configuration
- [Update Parameter](./i-sdk-config-parameter.md) - Update single config parameter

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | `{"result": "Success"}` |
| `200` | Invalid JSON format | `{"result": 400, "message": "Invalid enforcement format"}` |
| `200` | Enforcement not object | `{"result": 400, "message": "Enforcement must be an object"}` |
| `500` | Database error | `{"result": 500, "message": "Error saving enforcement..."}` |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **Complete replacement**: Enforcement object entirely replaced
2. **No merge behavior**: Old rules discarded on update
3. **Feature disabling**: false value removes feature from SDK config
4. **Parameter override**: Override values replace config values
5. **Whitelist filtering**: Invalid options silently removed
6. **Immediate effect**: Changes visible in next SDK request
7. **Real-time control**: No SDK restart required
8. **False special**: Only false has special meaning (feature disable)
9. **Safe keys only**: Validation ensures only SDK parameters stored
10. **Format flexibility**: Accepts JSON string or object
11. **Wrapped support**: Handles SDK response format (c field)
12. **Permission required**: Update permission needed

## Last Updated

February 2026
