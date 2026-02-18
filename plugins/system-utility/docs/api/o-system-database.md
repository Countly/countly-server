---
sidebar_label: "Get Database Stats"
---

# /o/system/database

## Overview

Retrieve database directory disk usage. Returns space consumed by MongoDB data directory.

---

## Endpoint


```plaintext
/o/system/database
```

## Authentication

- **Required**: Global admin permission (required)
- **HTTP Method**: GET or POST
- **Permission**: Global Admin only

## Response

#### Success Response
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{"overall": {"total": "100 GB", "used": "75 GB", "usage": "75%"}}
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

## Permissions

- Required: Global admin permission (required)


## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes | Global admin API key. |
| `auth_token` | String | No | Global admin auth token as query parameter or `Authorization: Bearer <token>` header. |


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.


## Database Collections

This endpoint does not read or write database collections.

## Examples

### Example 1: Get database disk usage

**Request** (GET):
```bash
curl "https://your-server.com/o/system/database?api_key=YOUR_GLOBAL_ADMIN_KEY"
```

---

## Related Endpoints

- [Get Disk Stats](./o-system-disks.md) - All filesystem usage
- [Database Check](./o-system-dbcheck.md) - DB connection status

---

## Implementation Notes

1. **Admin-only**: Requires global admin API key
2. **MongoDB-specific**: Database data directory size
3. **Capacity planning**: Track growth over time

## Last Updated

February 2026
