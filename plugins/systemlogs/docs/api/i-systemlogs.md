---
sidebar_label: "Record System Log"
---

# /i/systemlogs

## Overview

Record a system log entry. Used by internal workflows and can be called directly to append custom audit records. Supports JSON payloads for action data and records user and IP context.

---

## Endpoint


```plaintext
/i/systemlogs
```

## Authentication

- **Required**: Valid user context (admin or authorized user)
- **HTTP Method**: GET or POST
- **Permissions**: Valid user required (records `params.member`)

---


## Permissions

- Required: Valid user context (admin or authorized user)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `action` | String | Yes | Action name to record |
| `data` | String (JSON) | No | JSON string for action payload |

### Data Payload Conventions

Payload fields are stored in `i` inside the log record:

- `app_id`, `user_id` - Optional identifiers for linking
- `before`, `after` - Optional change snapshots for diff-based actions
- `name` - Optional entity name

---

## Response

### Success Response

**Status Code**: `200 OK`

**Body**:
```json
{"result": "Success"}
```

### Error Response

**Status Code**: `400 Bad Request` or `500 Internal Server Error`

**Body**:
```json
{"result": "error", "message": "Error description"}
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

### Example 1: Record a simple action

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/systemlogs" \
  -d "api_key=YOUR_API_KEY" \
  -d "action=custom_action" \
  -d "data={\"app_id\":\"63f9d5e...\",\"name\":\"Production App\"}"
```

### Example 2: Record a before/after change

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/systemlogs" \
  -d "api_key=YOUR_API_KEY" \
  -d "action=app_updated" \
  -d "data={\"app_id\":\"63f9d5e...\",\"before\":{\"timezone\":\"UTC\"},\"update\":{\"timezone\":\"Europe/Istanbul\"}}"
```

### Example 3: Record a user action with ID

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/systemlogs" \
  -d "api_key=YOUR_API_KEY" \
  -d "action=user_deleted" \
  -d "data={\"user_id\":\"617f9c...\",\"name\":\"demo_user\"}"
```

---

## Error Responses

| HTTP Code | Error | Description |
|-----------|-------|-------------|
| 400 | `Invalid payload` | Malformed JSON in `data` |
| 401 | `Unauthorized` | Missing or invalid API key |
| 500 | `Internal error` | Unexpected database or server error |

---

## Behavior Notes

- **JSON parsing**: `data` is parsed if provided as a JSON string.
- **User attribution**: Uses `params.member` to set `u` and `user_id`.
- **IP handling**: Stored unless `preventIPTracking` is enabled in feature config.
- **Action registry**: Updates `systemlogs.meta_v2` to include new actions.
- **Diff behavior**: If `before` and `update` are provided, only changed fields are recorded.

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

This endpoint does not read or write database collections.
## Related Endpoints

- [Query System Logs](./o-systemlogs-query.md) - Retrieve log entries
- [System Logs Meta](./o-systemlogs-meta.md) - Get filter metadata

---

## Enterprise

Plugin: systemlogs
Endpoint: /i/systemlogs

## Last Updated

February 2026
