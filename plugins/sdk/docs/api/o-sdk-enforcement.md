---
sidebar_label: "Get Enforcement"
---

# /o?method=sdk-enforcement

## Overview

Retrieve the current enforcement rules for an SDK application. Returns the server-side feature toggles and parameter overrides that will be applied to client requests. Enforcement allows administrators to disable features or parameters without requiring SDK updates. Complementary to standard configuration - shows what features are currently being overridden.

---

## Endpoint


```plaintext
/o?method=sdk-enforcement
```

## Authentication

- **Required**: API key with read permission
- **HTTP Method**: GET or POST
- **Permission**: Read access to SDK feature

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with read permission |
| `app_id` | String | Yes | Application ID |
| `method` | String | Yes | Must be "sdk-enforcement" |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `server._id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.c.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.t.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.v.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

#### Success Response - Enforcement Rules
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "tracking": false,
  "crt": false,
  "bom": true,
  "eqs": 200
}
```

#### Empty Enforcement - No Rules Applied
**Status Code**: `200 OK`

**Body**:
```json
{}
```

#### Error Response - App Not Found
**Status Code**: `200 OK`

**Body**:
```json
{"error": "App not found"}
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

- Required: API key with read permission


## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.sdks` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly_out.sdk_configs` | Remote config domain | Stores remote-config parameters, conditions, and related metadata. |
| `countly_out.sdk_enforcement` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

## Examples

### Example 1: Get enforcement rules - features disabled

**Description**: Check what features are being disabled

**Request** (GET):
```bash
curl "https://your-server.com/o?method=sdk-enforcement&api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{
  "tracking": false,
  "crt": false,
  "vt": false,
  "st": true,
  "ecz": true
}
```

**Interpretation**:
- `tracking: false` - Disables tracking despite SDK config
- `crt: false` - Disables crash reporting
- `vt: false` - Disables version tracking
- `st: true` - Enforces session tracking (must be true)
- `ecz: true` - Enforces event compression

### Example 2: Get enforcement with parameter overrides

**Description**: Check enforcement including parameter overrides

**Request** (GET):
```bash
curl "https://your-server.com/o?method=sdk-enforcement&api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{
  "eqs": 100,
  "rqs": 50,
  "bom_rqp": 25,
  "bom_at": 5,
  "sui": false
}
```

**Interpretation**:
- Queue sizes overridden to smaller values
- Batch reporting probability reduced
- User ID tracking disabled

### Example 3: Get enforcement - no rules set

**Description**: App has no enforcement rules

**Request** (GET):
```bash
curl "https://your-server.com/o?method=sdk-enforcement&api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{}
```

**Interpretation**:
- No enforcement active
- SDK will use default configuration
- All config parameters used as-is

---

## Behavior/Processing

### Enforcement Retrieval Process

1. **Parse** request parameters
2. **Verify** API key and read permission
3. **Validate** application exists
4. **Query** enforcement collection:
   - Get enforcement document by app_id
   - If not found: return empty object
5. **Return** raw enforcement object
6. **Format** response (no transformation)

### Enforcement vs Configuration

**Configuration** (`/o?method=sdk-config`):
- User-defined SDK settings
- What features are enabled by default
- What parameter values SDKs should use
- Baseline behavior specification

**Enforcement** (`/o?method=sdk-enforcement`):
- Server-side overrides
- What features to DISABLE (false) or FORCE ON (true)
- Parameter values to OVERRIDE
- Applied AFTER config is returned

### How Enforcement is Applied

**Enforcement application** (in SDK config endpoint):
```javascript
// Get basic config
var config = getSDKConfig(app_id);

// Get enforcement
var enforcement = getEnforcement(app_id);

// If enforcement exists, filter config
if (enforcement && Object.keys(enforcement).length > 0) {
  for (var key in enforcement) {
    if (enforcement[key] === false) {
      delete config[key];  // Remove feature
    } else {
      config[key] = enforcement[key];  // Override value
    }
  }
}

return config;
```

### Enforcement Structure

**Boolean enforcement** (feature on/off):
```javascript
{
  "tracking": false,    // Disable tracking
  "crt": true,          // Force crash reporting enabled
  "networking": false   // Disable networking
}
```

**Value enforcement** (override parameter):
```javascript
{
  "eqs": 100,           // Override event queue size
  "bom_rqp": 50,        // Override batch probability
  "bom_at": 10          // Override batch attempt time
}
```

---

## Technical Notes

### Database Operations

**Read Operation**:
- **Collection**: `sdk_enforcement`
- **Query**: `{_id: app_id + ""}`
- **Projection**: All fields (returns entire enforcement object)
- **Effect**: Read-only, no modifications

**Document retrieval**:
```javascript
var enforcement = common.outDb.collection("sdk_enforcement")
  .findOne({_id: app_id});
```

**Return value**:
- If document exists: return enforcement object
- If not exists: return empty object `{}`
- No error thrown for missing enforcement

### Enforcement Collection

**Document structure**:
```javascript
{
  "_id": "app_id",
  "tracking": false,
  "crt": false,
  "eqs": 150,
  "bom_rqp": 50,
  ...
}
```

**Created by**:
- Dashboard upload (config-upload)
- Admin parameter update (update-enforcement)
- Bulk operations with enforcement included

### Raw Data Return

**Key difference from SDK endpoint**:
- **SDK endpoint** (`/o/sdk?method=sc`): Wrapped with v,t,c
- **This endpoint**: Raw enforcement object returned directly
- **SDK endpoint**: Applied to config, SDK gets filtered result
- **This endpoint**: Returns enforcement rules as stored

**No processing applied**:
- No filtering for valid options
- No type conversion
- No wrapping
- Direct collection retrieval

---

## Related Endpoints

- [Get SDK Config (SDK)](./o-sdk-config.md) - Client retrieves config with enforcement applied
- [Get SDK Config (Admin)](./o-sdk-config-read.md) - Admin views raw config
- [Upload Config](./o-config-upload.md) - Save entire configuration
- [Update Enforcement](./i-sdk-config-enforcement.md) - Modify enforcement rules

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success with rules | `{enforcement object}` |
| `200` | Success without rules | `{}` |
| `200` | App not found | `{"error": "App not found"}` |
| `401` | Invalid API key | Authentication error |
| `500` | Database error | `{"result": 500, "message": "Error..."}` |

---

## Implementation Notes

1. **Read-only operation**: No data modification
2. **Inverse of configuration**: Shows what overrides are active
3. **Empty document safe**: Returns {} if not found
4. **Feature disabling**: false value removes feature from SDK config
5. **Value override**: Non-false values override config values
6. **No whitelist in return**: Returns exactly what's stored
7. **Server-side control**: Admin enforces without SDK update
8. **Real-time application**: Next SDK request sees enforcement
9. **Complements config**: Used with config-read for complete picture
10. **Admin dashboard**: Typically used for verification/debugging
11. **Applied on SDK request**: Enforcement filtering happens when SDK requests config
12. **Separate persistence**: Stored in different collection than config

## Last Updated

February 2026
