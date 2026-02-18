---
sidebar_label: "Take Heap Snapshot"
---

# /i/profiler/take-heap-snapshot

## Overview

Capture Node.js heap memory snapshot for memory analysis. Returns binary heap snapshot file (.heapsnapshot).

---

## Endpoint


```plaintext
/i/profiler/take-heap-snapshot
```

## Authentication

- **Required**: Global admin permission (required)
- **HTTP Method**: GET
- **Permission**: Global Admin only

## Response

#### Success Response
**Status Code**: `200 OK`

**Body**: Binary .heapsnapshot file

**Headers**:
### Success Response

```
Content-Type: plain/text
Content-Disposition: attachment; filename=heap.heapsnapshot
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

### Example 1: Get heap snapshot

**Request** (GET):
```bash
curl "https://your-server.com/i/profiler/take-heap-snapshot?api_key=YOUR_GLOBAL_ADMIN_KEY" \
  -o heap.heapsnapshot
```

---

## Related Endpoints

- [Start Profiler](./i-profiler-start.md) - Start profiling

---

## Implementation Notes

1. **Binary output**: Save as .heapsnapshot file
2. **Chrome compatible**: Open in DevTools Memory tab
3. **Memory intensive**: Snapshot size = heap size

## Last Updated

February 2026
