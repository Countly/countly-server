---
sidebar_label: "Get Metrics"
---

# /o?method=sdks

## Overview

Retrieve SDK metrics and usage statistics for an application. Returns aggregated data about SDK installations, versions in use, and platform distribution. Shows which SDK versions and platforms are actively reporting telemetry. Useful for monitoring SDK adoption, version rollout progress, and identifying legacy SDK versions still in use.

---

## Endpoint


```plaintext
/o?method=sdks
```

## Authentication

- **Required**: API key with read permission
- **HTTP Method**: GET or POST
- **Permission**: Read access to analytics data

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with read permission |
| `app_id` | String | Yes | Application ID |
| `method` | String | Yes | Must be "sdks" |
| `period` | String | No | Time period (optional filtering) |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `security.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server._id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.c.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.cdn.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.code.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.config.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.device_id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_autocomplete.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_char.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_min.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_number.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.password_symbol.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.path.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.t.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.v.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `tracking.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `white-labeling.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |

## Response

#### Success Response - SDK Metrics
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "data": [
    {
      "_id": "JavaScript/2.0.1",
      "total": 1250,
      "platforms": {
        "web": 1200,
        "mobile_web": 50
      }
    },
    {
      "_id": "Android/3.1.0",
      "total": 3400,
      "platforms": {
        "android": 3400
      }
    }
  ]
}
```

#### Empty Response - No SDK Data
**Status Code**: `200 OK`

**Body**:
```json
{"data": []}
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
| `countly.apps` | Application metadata/config | Stores app-level settings and metadata read/updated by this endpoint. |
| `countly.events` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.members` | Member/account metadata | Stores member identity/profile fields used for enrichment and ownership checks. |
| `countly.password_reset` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly.sdks` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `countly_out.sdk_configs` | Remote config domain | Stores remote-config parameters, conditions, and related metadata. |
| `countly_out.sdk_enforcement` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

## Examples

### Example 1: Get all SDK metrics

**Description**: Retrieve complete SDK usage statistics

**Request** (GET):
```bash
curl "https://your-server.com/o?method=sdks&api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{
  "data": [
    {
      "_id": "JavaScript/2.0.1",
      "total": 5000,
      "platforms": {
        "web": 4500,
        "mobile_web": 500
      }
    },
    {
      "_id": "JavaScript/2.0.0",
      "total": 1200,
      "platforms": {
        "web": 1000,
        "mobile_web": 200
      }
    },
    {
      "_id": "Android/3.1.0",
      "total": 8500,
      "platforms": {
        "android": 8500
      }
    },
    {
      "_id": "iOS/3.1.0",
      "total": 6200,
      "platforms": {
        "ios": 6200
      }
    }
  ]
}
```

**Interpretation**:
- JavaScript SDK 2.0.1: 5000 active sessions
- Android SDK 3.1.0: 8500 active sessions
- iOS SDK 3.1.0: 6200 active sessions
- Older JS 2.0.0: 1200 sessions (legacy still in use)

### Example 2: Get metrics for specific period

**Description**: Retrieve SDK metrics for last month

**Request** (GET):
```bash
curl "https://your-server.com/o?method=sdks&api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011&period=month"
```

**Response** (200):
```json
{
  "data": [
    {
      "_id": "Android/3.1.0",
      "total": 15420,
      "platforms": {
        "android": 15420
      }
    },
    {
      "_id": "iOS/3.1.0",
      "total": 12850,
      "platforms": {
        "ios": 12850
      }
    },
    {
      "_id": "JavaScript/2.0.2",
      "total": 8900,
      "platforms": {
        "web": 8200,
        "mobile_web": 700
      }
    }
  ]
}
```

### Example 3: Get metrics - no SDK data reported

**Description**: App with no SDK telemetry

**Request** (GET):
```bash
curl "https://your-server.com/o?method=sdks&api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439012"
```

**Response** (200):
```json
{"data": []}
```

---

## Behavior/Processing

### Metrics Collection Process

1. **Parse** request parameters
2. **Verify** API key and read permission
3. **Validate** application exists
4. **Query** metrics collection:
   - Get all SDK metric documents for app
   - Filter by period if provided
5. **Return** aggregated metrics
6. **Format** response as data array

### Data Aggregation

**Metrics structure**:
```javascript
{
  "_id": "SDK_Name/Version",    // e.g., "JavaScript/2.0.1"
  "total": 12500,                // Total sessions/instances
  "platforms": {
    "web": 10000,
    "mobile_web": 2500
  }
}
```

### Version Tracking

**SDK identification**:
- Combined SDK name and version
- Format: `{SDK_Name}/{version}`
- Examples: `JavaScript/2.0.1`, `Android/3.1.0`, `iOS/3.1.0`

### Platform Distribution

**Platform field analysis**:
```javascript
{
  "web": 4500,          // Web browser instances
  "mobile_web": 500,    // Mobile browser instances
  "android": 3400,      // Android app instances
  "ios": 2800,          // iOS app instances
  "windows": 150,       // Windows app instances
  "macos": 100          // macOS app instances
}
```

---

## Technical Notes

### Database Operations

**Read Operation**:
- **Collection**: `sdks` (or similar metrics collection)
- **Query**: Filter by app_id
- **Projection**: All fields
- **Aggregation**: Group by SDK name/version
- **Effect**: Read-only, no modifications

**Data retrieval**:
```javascript
var metrics = common.db.collection("sdks")
  .find({app_id: app_id})
  .toArray();
```

### Metrics Collection

**Document structure**:
```javascript
{
  "_id": "app_id|JavaScript/2.0.1",
  "app_id": "507f1f77bcf86cd799439011",
  "sdk": "JavaScript",
  "version": "2.0.1",
  "total": 5000,
  "platforms": {
    "web": 4500,
    "mobile_web": 500
  },
  "timestamp": 1234567890,
  "last_update": 1234567890
}
```

### Data Sources

**Metrics collected from**:
- SDK heartbeat/telemetry endpoints
- Session reporting if SDK data included
- Version headers in SDK requests
- Platform/device identification

**Updated by**:
- Ingestor processes (SDK telemetry)
- Background aggregation jobs
- Session tracking with SDK info

### Aggregation Strategy

**Time-based aggregation**:
- Recent period: Last active sessions
- Monthly: Month-level aggregation
- All-time: Total accumulated data

**Grouping by**:
- SDK name and version combination
- Platform/device type
- Time period if specified

---

## Related Endpoints

- [Get SDK Config](./o-sdk-config.md) - Client config retrieval
- [Get SDK Config (Admin)](./o-sdk-config-read.md) - Admin view of config
- [Get Enforcement](./o-sdk-enforcement.md) - View enforcement rules
- [Upload Config](./o-config-upload.md) - Save SDK configuration

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success with metrics | `{"data": [metrics]}` |
| `200` | Success without metrics | `{"data": []}` |
| `200` | App not found | `{"error": "App not found"}` |
| `401` | Invalid API key | Authentication error |
| `500` | Database error | `{"result": 500, "message": "Error..."}` |

---

## Implementation Notes

1. **Aggregated data**: Not real-time SDK config
2. **Metrics collection**: Separate from config/enforcement
3. **Version specific**: Tracks by SDK name and version
4. **Platform aware**: Segment metrics by platform
5. **Read-only**: No write operations
6. **Time-based**: Can filter by period
7. **No transformation**: Returns raw aggregated data
8. **Adoption tracking**: Monitor SDK upgrade progress
9. **Legacy detection**: Identify old SDK versions
10. **Usage statistics**: See platform distribution
11. **Dashboard integration**: Used for SDK analytics UI
12. **Periodic updates**: Metrics updated during session processing

## Last Updated

February 2026
