---
sidebar_label: "Crash Unshare"
---

# /i/crashes/unshare

## Endpoint

```plaintext
/i/crashes/unshare
```


## Overview

Remove public sharing from a crash group. Disables the public URL access.

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
| `args.crash_id` | String | Yes | Crash group ID |

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
/i/crashes/unshare
```
## Related Endpoints

- [/i/crashes/share](./i-crashes-share.md) - Enable public sharing

## Last Updated

February 2026
