---
sidebar_label: "List Profiler Files"
---

# /i/profiler/list-files

## Overview

List all available profiler output files from previous profiling sessions. Returns array of file names with metadata.

---

## Endpoint


```plaintext
/i/profiler/list-files
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
[
  "master-12345.cpuprofile",
  "master-12346.cpuprofile"
]
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

### Example 1: List profiler files

**Request** (GET):
```bash
curl "https://your-server.com/i/profiler/list-files?api_key=YOUR_GLOBAL_ADMIN_KEY"
```

---

## Related Endpoints

- [Download All](./i-profiler-download-all.md) - Get all files

---

## Implementation Notes

1. **Admin-only**: Requires global admin API key
2. **File listing**: Shows available results

## Last Updated

February 2026
