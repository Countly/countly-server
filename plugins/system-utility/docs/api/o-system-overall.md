---
sidebar_label: "Get Overall Stats"
---

# /o/system/overall

## Overview

Get combined system statistics including memory, CPU, and disk information in a single request.

---

## Endpoint


```plaintext
/o/system/overall
```

## Authentication

- **Required**: Global admin permission (required)
- **HTTP Method**: GET or POST
- **Permission**: Global Admin only

## Response

#### Success Response
**Status Code**: `200 OK`

**Body**: Combined memory, CPU, disk, and database stats

---


### Success Response

```json
{
  "result": "Success"
}
```


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

### Example 1: Get overall stats

**Request** (GET):
```bash
curl "https://your-server.com/o/system/overall?api_key=YOUR_GLOBAL_ADMIN_KEY"
```

---

## Related Endpoints

- [Get Memory Stats](./o-system-memory.md)
- [Get CPU Stats](./o-system-cpu.md)
- [Get Disk Stats](./o-system-disks.md)

---

## Implementation Notes

1. **Admin-only**: Requires global admin API key
2. **Combined data**: All metrics in one request

## Last Updated

February 2026
