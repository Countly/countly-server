---
sidebar_label: "Crash Delete"
---

# /i/crashes/delete

## Endpoint

```plaintext
/i/crashes/delete
```


## Overview

Permanently delete one or more crash groups and all associated data. Removes crash group, affected users records, and all related metadata.

---

## Authentication
- **Required Permission**: `Delete` (crashes feature)
- **HTTP Method**: POST
- **Content-Type**: application/x-www-form-urlencoded

---


## Permissions

- Required Permission: Delete (crashes feature)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `app_id` | String | Yes | Application ID |
| `args` | JSON | Yes | Arguments with crash IDs |
| `args.crashes` | Array | No | Array of crash group IDs to delete |
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

### Example 1: Delete crash group

**Request**:
```bash
curl -X POST "https://your-server.com/i/crashes/delete" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d 'args={"crash_id":"crash_123"}'
```

---

## Processing Details

For each crash group:
1. Logs crash_deleted systemlogs event
2. Removes from drill_events
3. Deletes crash group document
4. Removes from `app_crashusers`
5. Removes from `crash_share`
6. Updates meta document (decrement counts)

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `app_crashgroups` | Crash data domain | Stores crash reports, groups, comments, and crash-related metadata touched by this endpoint. |
| `app_crashusers` | User/member aggregates | Stores user and member records used by this endpoint. |
| `crash_share` | Crash data domain | Stores crash reports, groups, comments, and crash-related metadata touched by this endpoint. |
| `drill_events` | Drill event rows | Stores granular event records queried or updated by this endpoint. |
| `crashdata` | Crash data domain | Stores crash reports, groups, comments, and crash-related metadata touched by this endpoint. |

---

## Related Endpoints

- [/i/crashes/hide](./i-crashes-hide.md) - Hide crash (non-destructive)
- [/i/crashes/resolve](./i-crashes-resolve.md) - Mark as resolved

## Last Updated

February 2026
