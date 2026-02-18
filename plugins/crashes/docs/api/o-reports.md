---
sidebar_label: "Reports Read"
---

# /o?method=reports

## Endpoint

```plaintext
/o?method=reports
```


## Overview

Fetch specific crash report details by report IDs. Returns detailed information about individual crash reports including stack traces, context, and metadata.

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
| `report_ids` | JSON Array | No | Array of report IDs to fetch (alternative: `report_id` for single report) |
| `report_id` | String | No | Single report ID to fetch |

---

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `apps.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `crashes.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `dashboards.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `security.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.cdn.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.js.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.json.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.passwordSecret.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.path.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.reportField.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.report_limit.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `server.web.*` | Plugin/server defaults | Endpoint behavior controlled by this configuration namespace. | Changes can alter validation, filtering, limits, or processing behavior exposed by this endpoint. |
| `COUNTLY_CONFIG_HOSTNAME` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONFIG_PROTOCOL` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |
| `COUNTLY_CONTAINER` | Environment-defined | Runtime environment control used by endpoint execution path. | Incorrect values can change runtime behavior, callback routing, or error conditions. |

## Response

### Success Response

```json
{
  "report_id_1": {
    "_id": "report_id_1",
    "timestamp": 1707123456789,
    "error": "Stack trace content",
    "user_agent": "Mozilla/5.0...",
    "os": "iOS",
    "os_version": "16.0",
    "app_version": "1.0.0",
    "device": "iPhone",
    "nonfatal": true
  },
  "report_id_2": {
    ...
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

## Examples

### Example 1: Fetch multiple crash reports

**Request**:
```bash
curl -X GET "https://your-server.com/o?method=reports" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d 'report_ids=["crash_123","crash_456"]'
```

### Example 2: Fetch single crash report

**Request**:
```bash
curl -X GET "https://your-server.com/o?method=reports" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d "report_id=crash_123"
```

---

## Processing Details

The endpoint:
1. Validates read permissions for crash feature
2. Parses `report_ids` JSON parameter if provided
3. Falls back to single `report_id` parameter if array not provided
4. Fetches reports from crash tables/drill database
5. Returns map of report ID to full report data

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `drill_events` | Drill event rows | Stores granular event records queried or updated by this endpoint. |

---

## Error Handling

| Status | Message | Cause |
|--------|---------|-------|
| 401 | Unauthorized | Insufficient read permissions |
| 400 | Missing parameter | No report_ids or report_id provided |
| 500 | Server error | Database fetch failure |

---

## Related Endpoints

- [/o?method=crashes](./o-crashes-list.md) - List all crash groups
- [/o/crashes/download_stacktrace](./o-crashes-download-stacktrace.md) - Download stacktrace file

## Last Updated

February 2026
