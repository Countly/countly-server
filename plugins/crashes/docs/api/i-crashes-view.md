---
sidebar_label: "View Mark"
---

# /i/crashes/view

## Endpoint

```plaintext
/i/crashes/view
```


## Overview

Mark one or more crash groups as viewed. Clears the "is_new" flag for crashes to indicate they have been reviewed by the user.

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
| `args` | JSON | Yes | Arguments object with crash IDs |
| `args.crashes` | Array | No | Array of crash group IDs |
| `args.crash_id` | String | No | Single crash group ID |

---

## Response

### Success Response

```json
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

### Example 1: Mark crash as viewed

**Request**:
```bash
curl -X POST "https://your-server.com/i/crashes/view" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d 'args={"crash_id":"crash_123"}'
```

---

## Processing Details

1. Validates update permissions
2. For each crash with `is_new=true`:
   - Sets `is_new = false`
   - Decrements meta `isnew` count
3. Clears new crash notification

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `app_crashgroups` | Crash data domain | Stores crash reports, groups, comments, and crash-related metadata touched by this endpoint. |

---

## Related Endpoints

- [/i/crashes/resolve](./i-crashes-resolve.md) - Mark as resolved
- [/i/crashes/hide](./i-crashes-hide.md) - Hide crash

## Last Updated

February 2026
