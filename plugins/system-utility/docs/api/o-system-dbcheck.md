---
sidebar_label: "Database Check"
---

# /o/system/dbCheck

## Overview

Verify database connectivity and retrieve connection status. Checks if MongoDB is accessible and responsive.

---

## Endpoint


```plaintext
/o/system/dbCheck
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
{"status": "connected", "latency_ms": 2.5, "timestamp": "2024-02-13T10:30:00Z"}
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

### Example 1: Check database

**Request** (GET):
```bash
curl "https://your-server.com/o/system/dbCheck?api_key=YOUR_GLOBAL_ADMIN_KEY"
```

---

## Related Endpoints

- [Health Check](./o-system-healthcheck.md) - Overall system health
- [Get Database Stats](./o-system-database.md) - Database disk usage

---

## Implementation Notes

1. **Admin-only**: Requires global admin API key
2. **Connectivity test**: Verifies database access
3. **Latency measured**: Shows response time

## Last Updated

February 2026
