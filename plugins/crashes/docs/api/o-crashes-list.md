---
sidebar_label: "Crashes List Read"
---

# /o?method=crashes

## Endpoint

```plaintext
/o?method=crashes
```


## Overview

Fetch crash group list or details. Supports multiple query modes: list all crash groups, get details for a specific crash group, fetch users affected by a crash group, get breakdown by property, or retrieve aggregated crash metrics.

---

## Authentication
- **Required Permission**: `Read` (crashes feature)
- **HTTP Method**: GET or POST
- **Content-Type**: application/x-www-form-urlencoded

---


## Permissions

- Required Permission: Read (crashes feature)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `app_id` | String | Yes | Application ID |
| `group` | String | No | Crash group ID (for specific group operations) |
| `list` | Boolean | No | Return list of all crash groups |
| `userlist` | Boolean | No | Return list of affected user UIDs for a group |
| `breakdown` | Boolean | No | Get property breakdown for a group |
| `field` | String | No | Property field for breakdown (used with `breakdown=true`) |
| `graph` | Boolean | No | Return aggregated crash metrics and trends |
| `period` | String | No | Time period for graph data |
| `query` | JSON | No | Search/filter crashes by properties |
| `sSearch` | String | No | Text search on crash name |
| `filter` | String | No | Filter by status (crash-resolved, crash-hidden, crash-unresolved, crash-nonfatal, crash-fatal, crash-new, crash-viewed) |

---

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `crashes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `dashboards.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `security.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.cdn.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.conditions_per_paramaeters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.device_id.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.html.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.js.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.maximum_allowed_parameters.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.passwordSecret.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.path.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.report_limit.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.web.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `tracking.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `white-labeling.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `COUNTLY_CONFIG_HOSTNAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONFIG_PROTOCOL` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONTAINER` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |

## Response

### List Mode
### Success Response

```json
[
  {"_id": "group_id_1", "name": "NullPointerException"},
  {"_id": "group_id_2", "name": "OutOfMemoryError"}
]
```

### User List Mode
```json
["user_123", "user_456", "user_789"]
```

### Breakdown Mode
```json
{
  "app_id": "YOUR_APP_ID",
  "group": "group_id",
  "field": "os",
  "data": {
    "iOS": 45,
    "Android": 32,
    "Windows": 12
  }
}
```

### Graph/Details Mode
```json
{
  "users": {"total": 500, "affected": 120, "fatal": 30, "nonfatal": 90},
  "crashes": {
    "total": 450,
    "unique": 15,
    "resolved": 3,
    "unresolved": 12,
    "fatal": 40,
    "nonfatal": 410,
    "news": 2,
    "renewed": 1
  },
  "data": {...}
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

## Examples

### Example 1: Get list of all crash groups

**Request**:
```bash
curl -X GET "https://your-server.com/o?method=crashes" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d "list=true"
```

### Example 2: Get details for a specific crash group

**Request**:
```bash
curl -X GET "https://your-server.com/o?method=crashes" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d "group=crash_group_123"
```

### Example 3: Get users affected by a crash

**Request**:
```bash
curl -X GET "https://your-server.com/o?method=crashes" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d "group=crash_group_123" \
  -d "userlist=true"
```

### Example 4: Get crash breakdown by OS

**Request**:
```bash
curl -X GET "https://your-server.com/o?method=crashes" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d "group=crash_group_123" \
  -d "breakdown=true" \
  -d "field=os"
```

### Example 5: Get crash graph/metrics

**Request**:
```bash
curl -X GET "https://your-server.com/o?method=crashes" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d "graph=true" \
  -d "period=month"
```

---

## Processing Details

- `list=true`: Returns sanitized list of crash groups
- `group` + `userlist=true`: Fetches UIDs from app_crashusers collection
- `group` + `breakdown=true`: Aggregates drill_events by specified property
- `group` (no params): Returns full crash group details with latest reports
- `graph=true`: Returns aggregated statistics across all crash groups

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `app_crashgroups` | Crash data domain | Stores crash reports, groups, comments, and crash-related metadata touched by this endpoint. |
| `app_crashusers` | User/member aggregates | Stores user and member records used by this endpoint. |
| `drill_events` | Drill event rows | Stores granular event records queried or updated by this endpoint. |

---

## Error Handling

| Status | Message | Cause |
|--------|---------|-------|
| 401 | Unauthorized | Insufficient read permissions |
| 400 | Missing parameter | Missing required parameters |
| 500 | Server error | Database failure |

---

## Related Endpoints

- [/o?method=reports](./o-reports.md) - Fetch specific report details
- [/o?method=user_crashes](./o-user-crashes.md) - Get crashes for a specific user

## Last Updated

February 2026
