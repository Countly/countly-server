---
sidebar_label: "User Create"
---

# /i/app_users/create

## Endpoint

```plaintext
/i/app_users/create
```

## Overview

Create one app user document programmatically (outside SDK ingest flow).

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires write-level access for `app_id`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | Target app ID. |
| `data` | JSON String (Object) | Yes | App user payload. Must be valid JSON and non-empty. |

### `data` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `did` | String | Yes | Device ID. Used to derive the user document `_id`. |
| `uid` | String | No | User ID. Auto-generated from app sequence when omitted. |
| `_id` | String | No | If provided, it must equal SHA-1 of `app.key + did`. |
| `custom fields` | Any JSON type | No | Additional user properties stored on the profile document. |

## Response

### Success Response

```json
{
  "result": "User Created: {\"did\":\"device_1\",\"_id\":\"2f3e...\",\"uid\":\"1\"}"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Creation confirmation string that embeds the created user document JSON. |

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
  "result": "Missing parameter \"data\""
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Could not parse parameter \"data\": {bad-json}"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Parameter \"data\" cannot be empty"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Provide device_id as did property for data"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "App does not exist"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Based on app key and device_id, provided _id property should be 2f3e... Do not provide _id if you want api to use correct one"
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
| Insert with generated UID | `data.uid` not provided | Reads app, increments app `seq`, derives `_id`, inserts new user. | Wrapped string: `{ "result": "User Created: {...}" }` |
| Insert with provided UID | `data.uid` provided | Reads app, validates/provides `_id`, inserts new user without sequence increment. | Wrapped string: `{ "result": "User Created: {...}" }` |

### Impact on Other Data

- Updates `countly.apps` sequence (`seq`) when `uid` is auto-generated.
- Triggers plugin listeners for app-user creation, which may write additional plugin data.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level write permissions. |
| `countly.apps` | App validation and sequence generation | Reads app key for `_id` derivation and increments `seq` when generating `uid`. |
| `countly.app_users{appId}` | User profile storage | Inserts the created app-user document (including `did`, `uid`, `_id`, and custom fields). |

---
## Examples

### Example 1: Create app user

```plaintext
/i/app_users/create?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&data={"did":"device_1","name":"Alex"}
```

```json
{
  "result": "User Created: {\"did\":\"device_1\",\"name\":\"Alex\",\"_id\":\"2f3e...\",\"uid\":\"1\"}"
}
```

## Limitations

- `did` is mandatory.
- `_id` cannot be arbitrary; if provided, it must match the derived hash.

---
## Related Endpoints

- [App Users - Update](i-app-users-update.md)
- [App Users - Delete](i-app-users-delete.md)

## Last Updated

2026-02-17