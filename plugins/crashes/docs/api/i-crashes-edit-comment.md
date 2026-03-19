---
sidebar_label: "Comment Update"
---

# Crashes - Edit Comment

## Endpoint

```plaintext
/i/crashes/edit_comment
```

## Overview

Edits one comment on a crash group. Only the comment author or global admin can modify comment content.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `crashes` `Update` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | Target app ID for validation context. |
| `args` | JSON String (Object) | Yes | Edit payload. |
| `args.app_id` | String | Yes | App ID used by comment write path. |
| `args.crash_id` | String | Yes | Crash group ID. |
| `args.comment_id` | String | Yes | Comment ID to edit. |
| `args.text` | String | No | Updated text. |
| `args.time` | Number | No | Edit timestamp in ms. |

## Response

### Success Response

```json
{
  "result": "Success"
}
```

Note: this endpoint returns `Success` even when the comment is missing or user is not allowed to edit it.

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | `Success` for both applied updates and no-op branches. |

### Error Responses

- `400`

```json
{
  "result": "Please provide args parameter"
}
```

Standard auth/permission errors from update validation can also be returned.

## Behavior/Processing

- Finds target crash group and comment by `comment_id`.
- If user is author or global admin, updates comment in-place and sets `edit_time`.
- Emits `crash_edited_comment` system log action when update is applied.
- If comment not found / not permitted, returns `Success` without changes.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.app_crashgroups{appId}` | Crash comments | Updates matching `comments.$` entry when authorized. |
| `countly.systemlogs` | Audit trail | Receives `crash_edited_comment` action when update occurs. |

## Examples

```plaintext
/i/crashes/edit_comment?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&args={"app_id":"6991c75b024cb89cdc04efd2","crash_id":"crash_group_1","comment_id":"comment_1","text":"Fixed in build 24.3.1"}
```

## Related Endpoints

- [Crashes - Add Comment](./i-crashes-add-comment.md)
- [Crashes - Delete Comment](./i-crashes-delete-comment.md)

## Last Updated

2026-03-07
