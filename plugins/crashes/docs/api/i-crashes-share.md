---
sidebar_label: "Crash Share"
---

# /i/crashes/share

## Endpoint

```plaintext
/i/crashes/share
```


## Overview

Make a crash group publicly shareable. Enables a public URL that can be shared with external stakeholders without requiring authentication.

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
| `args` | JSON | Yes | Arguments with crash_id |
| `args.crash_id` | String | Yes | Crash group ID to share |

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

### Example 1: Share a crash

**Request**:
```bash
curl -X POST "https://your-server.com/i/crashes/share" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d 'args={"crash_id":"crash_123"}'
```

---

## Processing Details

1. Generates share token via SHA1 hash of app_id + crash_id
2. Inserts into `crash_share` collection
3. Sets `is_public = true` on crash group
4. Logs crash_shared systemlogs event

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `crash_share` | Crash data domain | Stores crash reports, groups, comments, and crash-related metadata touched by this endpoint. |
| `app_crashgroups` | Crash data domain | Stores crash reports, groups, comments, and crash-related metadata touched by this endpoint. |

---

## Related Endpoints

- [/i/crashes/unshare](./i-crashes-unshare.md) - Disable public sharing
- [/i/crashes/modify_share](./i-crashes-modify-share.md) - Modify share settings

## Last Updated

February 2026
