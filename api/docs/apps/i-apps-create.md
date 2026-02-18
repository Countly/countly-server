---
sidebar_label: "App Create"
---

# /i/apps/create

## Endpoint

```plaintext
/i/apps/create
```

## Overview

Create a new app definition, initialize core app-user indexes, and optionally upload app image.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Global admin permission is required.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `args` | JSON String (Object) | Yes | App creation payload. |

### `args` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | App display name. |
| `country` | String | No | ISO country code. Falls back to configured default if invalid/missing. |
| `timezone` | String | No | IANA timezone. Falls back to configured default if invalid/missing. |
| `category` | String | No | Category code (`1` to `20`). Falls back to configured default if invalid/missing. |
| `type` | String | No | App type. Invalid/missing values are normalized to `mobile`. |
| `key` | String | No | App key. Generated automatically when missing. |
| `checksum_salt` | String | No | Optional checksum salt used by SDK checksum workflows. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `apps.country` | Server config | Input normalization | Invalid/missing `args.country` is replaced with this default value. |
| `apps.timezone` | Server config | Input normalization | Invalid/missing `args.timezone` is replaced with this default value. |
| `apps.category` | Server config | Input normalization | Invalid/missing `args.category` is replaced with this default value. |

## Response

### Success Response

```json
{
  "_id": "64b0ac10c2c3ce0012dd1001",
  "name": "My App",
  "country": "US",
  "timezone": "Etc/UTC",
  "category": "6",
  "type": "mobile",
  "key": "3a4f9d...",
  "owner": "64afcc1a4f5f0f0012a11101",
  "created_at": 1717600000,
  "edited_at": 1717600000,
  "seq": 0,
  "has_image": false
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `_id` | String | New app ID. |
| `name` | String | App name. |
| `country` | String | Final country value after validation/defaulting. |
| `timezone` | String | Final timezone value after validation/defaulting. |
| `category` | String | Final category value after validation/defaulting. |
| `type` | String | Final app type. |
| `key` | String | App key (provided or generated). |
| `owner` | String | Creator member ID. |
| `created_at` | Number | Creation timestamp (seconds). |
| `edited_at` | Number | Last edit timestamp (seconds). |
| `seq` | Number | Initial app-user sequence counter. |
| `has_image` | Boolean | App image availability flag. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Error: Validation error details"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "App key already in use"
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "Error creating App: database error"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Auto-key creation | `args.key` is missing/empty | Generates a key, validates uniqueness, inserts app. | Raw object response (new app document). |
| Provided-key creation | `args.key` is provided | Validates key uniqueness, inserts app. | Raw object response (new app document). |

### Impact on Other Data

- Creates indexes on `countly.app_users{appId}` for core user analytics/query paths.
- Dispatches app-create integration hooks so other features can initialize app-scoped data.
- If app image is uploaded, stores image content in app image storage.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and owner assignment | Reads caller identity and sets `owner` field on created app. |
| `countly.apps` | App definition storage | Inserts the new app document. |
| `countly.app_users{appId}` | App-user profile index initialization | Creates indexes on the newly created app-user collection namespace. |
| `countly_fs` | App image storage | Stores app image file when image upload is included. |

---
## Examples

### Example 1: Create app with defaults

```plaintext
/i/apps/create?api_key=YOUR_API_KEY&args={"name":"My App"}
```

### Example 2: Create app with explicit region/timezone

```plaintext
/i/apps/create?api_key=YOUR_API_KEY&args={"name":"My App","country":"US","timezone":"America/New_York","category":"6"}
```

## Limitations

- Only global admins can create apps through this endpoint.
- App type must be supported by enabled app-type integrations; invalid values are normalized to `mobile`.

---
## Related Endpoints

- [Apps - App Update](i-apps-update.md)
- [Apps - App Delete](i-apps-delete.md)
- [Apps - App Read Details](o-apps-details.md)

## Last Updated

2026-02-17