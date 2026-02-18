---
sidebar_label: "Crash Unresolve"
---

# /i/crashes/unresolve

## Endpoint

```plaintext
/i/crashes/unresolve
```


## Overview

Mark one or more crash groups as unresolved. Resets the crash status and clears the resolved version information.

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
| `args` | JSON | Yes | Arguments object containing crash IDs |
| `args.crashes` | Array | No | Array of crash group IDs to unresolve |
| `args.crash_id` | String | No | Single crash group ID to unresolve |

---

## Response

### Success Response

```
{"result": "Success"}
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

### Example 1: Unresolve multiple crashes

**Request**:
```bash
curl -X POST "https://your-server.com/i/crashes/unresolve" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d 'args={"crashes":["crash_123","crash_456"]}'
```

---

## Processing Details

The endpoint:
1. Validates update permissions
2. Parses args JSON parameter
3. For each crash group:
   - Sets `is_resolved` = false
   - Clears `resolved_version`
   - Sets `is_resolving` = false
4. Decrements meta resolved count
5. Dispatches crash_unresolved systemlogs event

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

- [/i/crashes/resolve](./i-crashes-resolve.md) - Mark crash as resolved
- [/i/crashes/resolving](./i-crashes-resolving.md) - Mark as resolving

## Last Updated

February 2026
