---
sidebar_label: "Message Toggle"
---

# Push - Message Toggle

## Endpoint

```plaintext
/i/push/message/toggle
```

## Overview

Starts or stops a toggleable push message.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `push` `Update` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | App ID used by permission validation. |
| `_id` | String (ObjectID) | Yes | Message ID to toggle. |
| `active` | Boolean String | Yes | `true` to activate, `false` to stop. |

## Response

### Success Response

```json
{
  "_id": "67a3d2f5c1a23b0f4d6c0101",
  "status": "active",
  "result": {
    "updated": "2026-03-07T09:22:11.320Z"
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Full updated message object (`msg.json`) after toggle operation. |
| `status` | String | New runtime status after toggle. |
| `result` | Object | Message result metadata maintained by push engine. |

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
    "The message doesn't have Cohort or Event trigger"
  ]
}
```

- `400`

```json
{
  "kind": "ValidationError",
  "errors": [
    "The message is already active"
  ]
}
```

- `400`

```json
{
  "kind": "ValidationError",
  "errors": [
    "The message is already stopped"
  ]
}
```

Standard authentication/authorization errors from update validation can also be returned.

## Behavior/Processing

- Validates `_id` and `active` (`BooleanString`).
- Loads message by ID.
- Allows toggle only for API/automated message types (`triggerAutoOrApi`).
- If currently streamable (`State.Streamable`) and `active=false`: stops message and logs `push_message_deactivated`.
- If currently stopped and `active=true`: schedules message and logs `push_message_activated`.
- Returns full updated message JSON.

### Impact on Other Data

- Updates message scheduling/runtime state in `countly.messages`.
- Adds one audit entry in `countly.systemlogs` for activation/deactivation.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.messages` | Push message storage | Reads target message and updates runtime state through message model operations. |
| `countly.systemlogs` | Audit trail | Receives activation/deactivation actions. |

## Examples

### Activate a message

```plaintext
/i/push/message/toggle?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  _id=67a3d2f5c1a23b0f4d6c0101&
  active=true
```

## Limitations

- One-time/plain messages are not toggleable.

## Related Endpoints

- [Push - Message Update](message-update.md)
- [Push - Message Delete](message-remove.md)

## Last Updated

2026-03-07
