---
sidebar_label: "Get Disk Stats"
---

# /o/system/disks

## Overview

Retrieve disk space statistics for all mounted filesystems. Returns total, used, free space and utilization percentage per disk.

---

## Endpoint


```plaintext
/o/system/disks
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
{
  "overall": {"total": "500 GB", "free": "150 GB", "used": "350 GB", "usage": "70%"},
  "details": [{"id": "/", "total": "500 GB", "free": "150 GB", "used": "350 GB", "usage": "70%"}]
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

### Example 1: Get disk usage

**Request** (GET):
```bash
curl "https://your-server.com/o/system/disks?api_key=YOUR_GLOBAL_ADMIN_KEY"
```

---

## Related Endpoints

- [Get Memory Stats](./o-system-memory.md) - Memory information
- [Get Database Stats](./o-system-database.md) - DB disk usage

---

## Implementation Notes

1. **Admin-only**: Requires global admin API key
2. **All filesystems**: Includes all mounted disks
3. **Usage percentage**: Calculated from totals

## Last Updated

February 2026
