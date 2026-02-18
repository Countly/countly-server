---
sidebar_label: "Stop Profiler"
---

# /i/profiler/stop

## Overview

Stop CPU and memory profiling. Saves profile data and generates reports. Clears the 2-hour timeout.

---

## Endpoint


```plaintext
/i/profiler/stop
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
{"result": "Stoping profiler for all processes"}
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

### Example 1: Stop profiler

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/profiler/stop" \
  -d "api_key=YOUR_GLOBAL_ADMIN_KEY"
```

---

## Related Endpoints

- [Start Profiler](./i-profiler-start.md) - Begin profiling
- [List Files](./i-profiler-list-files.md) - View results

---

## Implementation Notes

1. **Admin-only**: Requires global admin API key
2. **Saves data**: Profile written to disk
3. **Generates results**: Ready to download

## Last Updated

February 2026
