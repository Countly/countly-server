---
sidebar_label: "Download Profiler Data"
---

# /i/profiler/download-all

## Overview

Download all profiler files as a compressed tar archive. Includes all CPU profiles and heap snapshots from previous profiling sessions.

---

## Endpoint


```plaintext
/i/profiler/download-all
```

## Authentication

- **Required**: Global admin permission (required)
- **HTTP Method**: GET
- **Permission**: Global Admin only

## Response

#### Success Response
**Status Code**: `200 OK`

**Body**: Tar archive with profiler files

**Headers**:
### Success Response

```
Content-Type: plain/text
Content-Disposition: attachment; filename=profiler.tar
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

### Example 1: Download all profiles

**Request** (GET):
```bash
curl "https://your-server.com/i/profiler/download-all?api_key=YOUR_GLOBAL_ADMIN_KEY" \
  -o profiler.tar
```

---

## Related Endpoints

- [List Files](./i-profiler-list-files.md) - See available files

---

## Implementation Notes

1. **Tar format**: Compressed archive
2. **Admin-only**: Requires global admin API key
3. **All files**: Includes all profiler results

## Last Updated

February 2026
