---
sidebar_label: "Comment Delete"
---

# /i/crashes/delete_comment

## Endpoint

```plaintext
/i/crashes/delete_comment
```


## Overview

Delete a comment from a crash group. Only the comment author or global admin can delete.

---

## Authentication
- **Required Permission**: `Delete` (crashes feature)

---


## Permissions

- Required Permission: Delete (crashes feature)

## Request Parameters

| Parameter | Type | Required |
|-----------|------|----------|
| `api_key` | String | Yes |
| `app_id` | String | Yes |
| `args` | JSON | Yes |
| `args.app_id` | String | Yes | Application ID |
| `args.crash_id` | String | Yes | Crash group ID |
| `args.comment_id` | String | Yes | Comment ID to delete |

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
/i/crashes/delete_comment
```
## Related Endpoints

- [/i/crashes/add_comment](./i-crashes-add-comment.md) - Add comment
- [/i/crashes/edit_comment](./i-crashes-edit-comment.md) - Edit comment

## Last Updated

February 2026
