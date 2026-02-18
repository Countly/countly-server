---
sidebar_label: "Get CPU Stats"
---

# /o/system/cpu

## Overview

Retrieve CPU usage statistics. Returns system-wide average, per-core breakdown, and utilization percentage.

---

## Endpoint


```plaintext
/o/system/cpu
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
  "overall": {"usage": "45.2%", "cores": 8},
  "cores": [
    {"id": "cpu0", "usage": "42.1%"},
    {"id": "cpu1", "usage": "48.3%"}
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

### Example 1: Get CPU usage

**Request** (GET):
```bash
curl "https://your-server.com/o/system/cpu?api_key=YOUR_GLOBAL_ADMIN_KEY"
```

---

## Related Endpoints

- [Get Memory Stats](./o-system-memory.md) - Memory information
- [Health Check](./o-system-healthcheck.md) - System health

---

## Implementation Notes

1. **Admin-only**: Requires global admin API key
2. **Real-time data**: Fresh on each call
3. **Per-core info**: Detailed breakdown available

## Last Updated

February 2026
