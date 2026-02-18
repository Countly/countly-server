---
sidebar_label: "System Logs Meta"
---

# /o?method=systemlogs_meta

## Overview

Return system log metadata used by UI filters, along with a user list. Metadata is derived from the `meta_v2` document in the `systemlogs` collection and includes known values for action types and other categories.

---

## Endpoint


```plaintext
/o?method=systemlogs_meta
```

## Authentication

- **Required**: Global admin permission (required)
- **HTTP Method**: GET or POST
- **Permissions**: Global Admin only

---


## Permissions

- Required: Global admin permission (required)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `method` | String | Yes | Must be `systemlogs_meta` |

---

## Response

### Success Response

**Status Code**: `200 OK`

**Body**:
```json
{
  "action": [
    "app_created",
    "app_updated",
    "user_created",
    "user_deleted"
  ],
  "users": [
    {
      "_id": "617f9c7e5b25eea3b9afabf8",
      "username": "admin",
      "email": "admin@company.com",
      "full_name": "Admin User"
    }
  ]
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

### Example 1: Get metadata

**Request** (GET):
```bash
curl "https://your-server.com/o?method=systemlogs_meta&api_key=YOUR_GLOBAL_ADMIN_KEY"
```

### Example 2: POST style

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o" \
  -d "method=systemlogs_meta" \
  -d "api_key=YOUR_GLOBAL_ADMIN_KEY"
```

---

## Error Responses

| HTTP Code | Error | Description |
|-----------|-------|-------------|
| 401 | `Unauthorized` | Missing or invalid global admin API key |
| 500 | `Internal error` | Unexpected database or server error |

---

## Behavior Notes

- **Meta source**: Uses `systemlogs` document with `_id: meta_v2`.
- **Key decoding**: Stored keys are decoded before returning to clients.
- **User list**: Fetches all users from `members` with `username`, `email`, `full_name`.
- **Empty state**: Returns an empty object with `users: []` if no metadata exists.

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `systemlogs` | Audit trail | Stores system action records read/written by this endpoint. |
| `members` | Member/account metadata | Stores member identity/profile fields used for enrichment and ownership checks. |

---

## Related Endpoints

- [Query System Logs](./o-systemlogs-query.md) - Retrieve log entries
- [Record System Log](./i-systemlogs.md) - Write log entries

---

## Enterprise

Plugin: systemlogs
Endpoint: /o?method=systemlogs_meta

## Last Updated

February 2026
