---
sidebar_label: "Stop Inspector"
---

# /i/inspector/stop

## Overview

Disable Node.js inspector debugging. Closes the debugging port and terminates all active debug sessions. Clears the 2-hour timeout.

---

## Endpoint


```plaintext
/i/inspector/stop
```

## Authentication

- **Required**: Global admin permission (required)
- **HTTP Method**: GET or POST
- **Permission**: Global Admin only

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | Global admin API key |

## Response

#### Success Response
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{"result": "Stoping inspector for all processes"}
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


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.


## Database Collections

This endpoint does not read or write database collections.

## Examples

### Example 1: Stop inspector

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/inspector/stop" \
  -d "api_key=YOUR_GLOBAL_ADMIN_KEY"
```

---

## Related Endpoints

- [Start Inspector](./i-inspector-start.md) - Enable debugging

---

## Implementation Notes

1. **Admin-only**: Requires global admin API key
2. **Requires active**: Must be started first
3. **Immediate effect**: Closes debugging connections

## Last Updated

February 2026
