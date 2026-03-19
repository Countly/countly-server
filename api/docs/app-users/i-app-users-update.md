---
sidebar_label: "App User Update"
---

# /i/app_users/update

## Endpoint

```plaintext
/i/app_users/update
```

## Overview

Update app user documents by query using MongoDB update modifiers.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires write-level app access.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | Target app ID. |
| `query` | JSON String (Object) | Yes | MongoDB query selecting users to update. |
| `update` | JSON String (Object) | Yes | MongoDB update modifiers (`$set`, `$unset`, `$inc`, etc.). |
| `force` | Boolean/String | No | Required when query matches more than one user. |

### `update` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `$set` | Object | No | Assigns field values. |
| `$unset` | Object | No | Removes fields. |
| `$inc` | Object | No | Increments numeric fields. |
| `$push` / `$pull` | Object | No | Updates array fields. |
| `other Mongo modifiers` | Object | No | Allowed when key starts with `$`. |

## Response

### Success Response

```json
{
  "result": "User Updated"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Update status message. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"app_id\""
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"query\""
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"update\""
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Could not parse parameter \"update\": {bad-json}"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Could not parse parameter \"query\": {bad-json}"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Parameter \"update\" cannot be empty"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "No users matching criteria"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "This query would update more than one user"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Unkown modifier name in {\"name\":\"Alex\"} for {\"uid\":\"1\"}"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Single-user update | Query matches exactly one user | Validates modifiers, updates matching user document. | Wrapped string: `{ "result": "User Updated" }` |
| Multi-user update | Query matches more than one user and `force` is provided | Applies `updateMany` to all matched users. | Wrapped string: `{ "result": "User Updated" }` |
| Multi-user blocked | Query matches more than one user and `force` is missing | Update is rejected before write. | Wrapped error string: `{ "result": "This query would update more than one user" }` |

### Impact on Other Data

- Triggers plugin listeners for app-user updates, so plugin-specific user data may be updated as part of the same operation.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level write permissions. |
| `countly.app_users{appId}` | User query and update target | Counts matched users and applies MongoDB modifier updates to matching documents. |

---
## Examples

### Example 1: Update one user property

```plaintext
/i/app_users/update?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&query={"uid":"1"}&update={"$set":{"name":"Jane"}}
```

```json
{
  "result": "User Updated"
}
```

## Limitations

- Non-modifier update objects are rejected (`update` keys must start with `$`).
- Multi-user updates require explicit `force`.

---
## Related Endpoints

- [App Users - Create](i-app-users-create.md)
- [App Users - Delete](i-app-users-delete.md)

## Last Updated

2026-02-17
