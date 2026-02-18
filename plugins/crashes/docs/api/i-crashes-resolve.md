---
sidebar_label: "Crash Resolve"
---

# /i/crashes/resolve

## Endpoint

```plaintext
/i/crashes/resolve
```


## Overview

Mark one or more crash groups as resolved. Sets the crash status to resolved with the current app version as the resolution version.

---

## Authentication
- **Required Permission**: `Update` (crashes feature)
- **HTTP Method**: POST
- **Content-Type**: application/x-www-form-urlencoded

---


## Permissions

- Required Permission: Update (crashes feature)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `app_id` | String | Yes | Application ID |
| `args` | JSON | Yes | Arguments object containing crash IDs or single crash_id |
| `args.crashes` | Array | No | Array of crash group IDs to resolve |
| `args.crash_id` | String | No | Single crash group ID to resolve (if crashes array not provided) |

---

## Response

### Success Response

```json
{
  "crash_id_1": "1.2.3",
  "crash_id_2": "1.2.4"
}
```

Returns map of crash ID to resolved version.

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

### Example 1: Resolve multiple crashes

**Request**:
```bash
curl -X POST "https://your-server.com/i/crashes/resolve" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d 'args={"crashes":["crash_123","crash_456"]}'
```

### Example 2: Resolve single crash

**Request**:
```bash
curl -X POST "https://your-server.com/i/crashes/resolve" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d 'args={"crash_id":"crash_123"}'
```

---

## Processing Details

The endpoint:
1. Validates update permissions
2. Parses args JSON parameter
3. Gets crash array or single ID
4. For each crash group:
   - Sets `is_resolved` = true
   - Sets `resolved_version` = current app version
   - Clears `is_renewed` and `is_new` flags
   - Sets `is_resolving` = false
5. Updates meta document with resolved count
6. Dispatches systemlogs event

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `app_crashgroups` | Crash data domain | Stores crash reports, groups, comments, and crash-related metadata touched by this endpoint. |

---

## Error Handling

| Status | Message | Cause |
|--------|---------|-------|
| 401 | Unauthorized | Insufficient update permissions |
| 400 | Please provide args parameter | args missing |
| 404 | Not found | Crash group doesn't exist |
| 500 | Server error | Database failure |

---

## Related Endpoints

- [/i/crashes/unresolve](./i-crashes-unresolve.md) - Mark crash as unresolved
- [/i/crashes/resolving](./i-crashes-resolving.md) - Mark as in-progress resolution

## Last Updated

February 2026
