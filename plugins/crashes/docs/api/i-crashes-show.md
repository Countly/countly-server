---
sidebar_label: "Crash Show"
---

# /i/crashes/show

## Endpoint

```plaintext
/i/crashes/show
```


## Overview

Unhide previously hidden crash groups.

---

## Authentication
- **Required Permission**: `Update` (crashes feature)

---


## Permissions

- Required Permission: Update (crashes feature)

## Request Parameters

| Parameter | Type | Required |
|-----------|------|----------|
| `api_key` | String | Yes |
| `app_id` | String | Yes |
| `args` | JSON | Yes |
| `args.crashes` | Array | No | Crash group IDs |
| `args.crash_id` | String | No | Single crash ID |

---

## Response

### Success Response

```json
{"result": "Success"}
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



## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.


## Database Collections

This endpoint does not read or write database collections.

## Examples

### Endpoint formation

```plaintext
/i/crashes/show
```
## Related Endpoints

- [/i/crashes/hide](./i-crashes-hide.md) - Hide crash

## Last Updated

February 2026
