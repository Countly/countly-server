---
sidebar_label: "Message Get"
---

# Push - Message Get

## Endpoint

```plaintext
/o/push/message
```

## Overview

Returns one push message object by ID.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `push` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | App ID used by permission validation. |
| `_id` | String (ObjectID) | Yes | Message ID to fetch. |

## Response

### Success Response

```json
{
  "_id": "67a3d2f5c1a23b0f4d6c0101",
  "status": "created",
  "platforms": ["a", "i"],
  "contents": [
    {"message": "Hello users"}
  ],
  "triggers": [
    {"kind": "plain"}
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Full message object (`msg.json`) from push message model. |
| `_id` | String | Message ID. |
| `status` | String | Current push message status. |
| `platforms` | Array | Target platforms. |
| `contents` | Array | Localized/title/body payload content entries. |
| `triggers` | Array | Message trigger definitions. |

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

Standard authentication/authorization errors from read validation can also be returned.

## Behavior/Processing

- Validates `_id` as ObjectID.
- Loads message with `Message.findOne(_id)`.
- Returns raw message JSON payload via raw response body.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.messages` | Push message storage | Reads one message document by ID. |

## Examples

### Read one message

```plaintext
/o/push/message?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  _id=67a3d2f5c1a23b0f4d6c0101
```

## Related Endpoints

- [Push - Message List](message-all.md)
- [Push - Message Update](message-update.md)

## Last Updated

2026-03-07
