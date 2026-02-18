---
sidebar_label: "Create"
---

# /i/crashes/add_comment

## Endpoint

```plaintext
/i/crashes/add_comment
```


## Overview

Add a comment to a crash group. Comments allow users to collaborate and document findings about crashes.

---

## Authentication
- **Required Permission**: `Create` (crashes feature)
- **HTTP Method**: POST
- **Content-Type**: application/x-www-form-urlencoded

---


## Permissions

- Required Permission: Create (crashes feature)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `app_id` | String | Yes | Application ID |
| `args` | JSON | Yes | Arguments with comment details |
| `args.app_id` | String | Yes | Application ID |
| `args.crash_id` | String | Yes | Crash group ID |
| `args.text` | String | No | Comment text |
| `args.time` | Timestamp | No | Comment timestamp (default: current time) |

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

### Example 1: Add comment to crash

**Request**:
```bash
curl -X POST "https://your-server.com/i/crashes/add_comment" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d 'args={"app_id":"YOUR_APP_ID","crash_id":"crash_123","text":"Fixed in release 1.5.0"}'
```

---

## Processing Details

1. Validates create permissions
2. Creates comment object with:
   - `text` - Comment text
   - `author` - Current user full_name
   - `author_id` - Current user ID
   - `time` - Timestamp
   - `_id` - SHA1 hash unique identifier
3. Adds to crash group's comments array
4. Logs crash_added_comment event

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
| 401 | Unauthorized | Insufficient permissions |
| 400 | Please provide args parameter | args missing |
| 500 | Server error | Database failure |

---

## Related Endpoints

- [/i/crashes/edit_comment](./i-crashes-edit-comment.md) - Edit existing comment
- [/i/crashes/delete_comment](./i-crashes-delete-comment.md) - Delete comment

## Last Updated

February 2026
