---
sidebar_label: "Resolving Update"
---

# /i/crashes/resolving

## Endpoint

```plaintext
/i/crashes/resolving
```


## Overview

Mark crash groups as being actively resolved/worked on.

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
/i/crashes/resolving
```
## Related Endpoints

- [/i/crashes/resolve](./i-crashes-resolve.md) - Mark as resolved
- [/i/crashes/unresolve](./i-crashes-unresolve.md) - Mark as unresolved

## Last Updated

February 2026
