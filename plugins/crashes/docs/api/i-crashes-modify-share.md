---
sidebar_label: "Share Modify"
---

# /i/crashes/modify_share

## Endpoint

```plaintext
/i/crashes/modify_share
```


## Overview

Modify the sharing settings and permissions for a public crash group.

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
| `args.data` | JSON | Yes | Share configuration data |

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
/i/crashes/modify_share
```
## Related Endpoints

- [/i/crashes/share](./i-crashes-share.md) - Enable sharing
- [/i/crashes/unshare](./i-crashes-unshare.md) - Disable sharing

## Last Updated

February 2026
