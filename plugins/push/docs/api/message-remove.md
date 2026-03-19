---
sidebar_label: "Message Delete"
---

# Push - Message Delete

## Endpoint

```plaintext
/i/push/message/remove
```

## Overview

Soft-deletes a push message by marking it deleted.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `push` `Delete` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | App ID used by permission validation. |
| `_id` | String (ObjectID) | Yes | Message ID to remove. |

## Response

### Success Response

```json
{}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Empty object returned when deletion succeeds. |

### Error Responses

- `400`

```json
{
  "errors": [
    "_id is required"
  ]
}
```

- `404`

```json
{
  "errors": [
    "Message not found"
  ]
}
```

- `400`

```json
{
  "kind": "ValidationError",
  "errors": [
    "Failed to delete the message, please try again"
  ]
}
```

Standard authentication/authorization errors from remove validation can also be returned.

## Behavior/Processing

- Validates `_id` as ObjectID.
- Loads message that is not already deleted.
- Stops active/scheduled execution via `msg.stop(...)`.
- Marks message as deleted with atomic update and stores removal metadata:
  - `result.removed`
  - `result.removedBy`
  - `result.removedByName`
- Emits `push_message_deleted` system log action on success.

### Impact on Other Data

- Updates one message document state in `countly.messages`.
- Adds one audit entry in `countly.systemlogs`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.messages` | Push message storage | Reads target message and updates deletion state/metadata. |
| `countly.systemlogs` | Audit trail | Receives `push_message_deleted` action payload. |

## Examples

### Delete one message

```plaintext
/i/push/message/remove?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  _id=67a3d2f5c1a23b0f4d6c0101
```

## Related Endpoints

- [Push - Message Create](message-create.md)
- [Push - Message Update](message-update.md)
- [Push - Message Toggle](message-toggle.md)

## Last Updated

2026-03-07
