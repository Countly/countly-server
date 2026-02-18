---
sidebar_label: "Get Config (Admin)"
---

# /o?method=sdk-config

## Overview

Dashboard admin endpoint to retrieve the current SDK configuration for an application. Allows administrators to view the configuration that controls SDK behavior without enforcement filtering. Useful for debugging and reviewing current configuration state.

---

## Endpoint


```plaintext
/o?method=sdk-config
```

## Authentication

- **Required**: API key with read permission
- **HTTP Method**: GET recommended
- **Permission**: Read access to SDK feature

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with read permissions |
| `app_id` | String | Yes | Application ID |
| `method` | String | Yes | Must be "sdk-config" |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `server._id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.c.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.json.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.t.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.v.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

#### Success Response - Raw Configuration
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "tracking": true,
  "networking": true,
  "crt": true,
  "vt": true,
  "st": true,
  "cet": true,
  "ecz": true,
  "bom": true,
  "bom_at": 10,
  "bom_rqp": 50,
  "bom_ra": 24,
  "bom_d": 60
}
```

#### Empty Configuration
**Status Code**: `200 OK`

**Body**:
```json
{}
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

### Example 1: View current SDK configuration

**Description**: Admin retrieves raw configuration for review

**Request** (GET):
```bash
curl "https://your-server.com/o?method=sdk-config&api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{
  "tracking": true,
  "crt": true,
  "vt": true,
  "st": true,
  "bom": true,
  "bom_at": 10,
  "bom_rqp": 50
}
```

### Example 2: Configuration with numeric parameters

**Description**: View config including threshold and probability values

**Request** (GET):
```bash
curl "https://your-server.com/o?method=sdk-config&api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{
  "tracking": true,
  "eqs": 100,
  "rqs": 50,
  "bom": true,
  "bom_at": 15,
  "bom_rqp": 75,
  "bom_ra": 30,
  "bom_d": 120
}
```

### Example 3: No configuration exists

**Description**: App with no SDK configuration yet

**Request** (GET):
```bash
curl "https://your-server.com/o?method=sdk-config&api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439012"
```

**Response** (200):
```json
{}
```

---

## Behavior/Processing

### Configuration Retrieval

1. **Parse** request and validate parameters
2. **Check** read permission for SDK feature
3. **Fetch** SDK config from `sdk_configs` collection
4. **Return** raw configuration object

### Key Difference from /o/sdk?method=sc

**This endpoint**:
- Returns raw stored configuration
- No enforcement filtering
- No version/timestamp wrapping
- Regular object format

**/o/sdk?method=sc endpoint**:
- Returns wrapped with v, t, c fields
- Applies enforcement rules (removes disabled keys)
- Adds response metadata
- SDK client format

### Configuration Object

**Direct field return**:
```javascript
return res.config || {}
```

**No transformation**:
- bom_rqp NOT converted (stays as percentage)
- All values returned as stored
- No enforcement applied
- Raw database representation

---

## Technical Notes

### Database Operations

**Read Operation**:
- **Collection**: `sdk_configs`
- **Query**: `{_id: app_id}`
- **Field returned**: `config` object
- **Default**: Empty object if not found

**No write operations**: Read-only endpoint

### Storage Format

**Raw percentages**:
```javascript
// Stored as percentage (0-100)
bom_rqp: 50

// Returned as-is (NOT converted to 0-1.0 decimal)
// Different from /o/sdk endpoint which converts
```

### Permission Check

**validateRead()**:
- Checks read permission
- Feature name: "sdk"
- API key scope verification

### Access Control

**Non-admin users**: Can access

**Global admins**: Full access

**Requires**: Read permission only

---

## Related Endpoints

- [Get SDK Config (SDK)](./o-sdk-config.md) - SDK client endpoint with enforcement
- [Save Config](./o-config-upload.md) - Upload new configuration
- [Get Enforcement](./o-sdk-enforcement.md) - View enforcement rules
- [Update Parameter](./i-sdk-config-parameter.md) - Modify individual parameter

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - config returned | Configuration object |
| `200` | No config exists | Empty object `{}` |
| `400` | Missing app_id | Error message |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **Raw data**: Returns exactly what's stored (no transformation)
2. **No enforcement**: Shows server config without filters
3. **Admin view**: Safe for dashboard display
4. **Different format**: Unlike SDK endpoint which wraps response
5. **Percentage values**: Stored as percentages (not decimal like SDK gets)
6. **Empty object valid**: Returns `{}` if no config created
7. **Read access only**: Doesn't require update permission
8. **No caching**: Fresh data each request
9. **Comparison tool**: Use with enforcement endpoint to compare
10. **Debugging**: Useful for verifying configuration before SDK receives it
11. **Non-breaking**: Can view without modifications
12. **Direct comparison**: Can directly compare with enforcement rules

## Last Updated

February 2026
