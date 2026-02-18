---
sidebar_label: "App Update"
---

# /i/apps/update

## Endpoint

```plaintext
/i/apps/update
```

## Overview

Update app metadata fields such as name, type, country, timezone, key, lock status, and checksum salt alias.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Global admin can always call this endpoint.
- App admins can call this endpoint when app context is provided for app-level authorization.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Conditionally | Top-level app context used by route-level app-admin authorization flow. |
| `args` | JSON String (Object) | Yes | App update payload. |

### `args` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `app_id` | String | Yes | Target app ID. |
| `name` | String | No | New app name. Empty string is rejected. |
| `type` | String | No | New app type. Must be valid and enabled. |
| `category` | String | No | New category (`1` to `20`). |
| `key` | String | No | New app key. Must be unique and non-empty when provided. |
| `timezone` | String | No | New IANA timezone. |
| `country` | String | No | New ISO country code. |
| `salt` | String | No | Checksum salt alias field. |
| `locked` | Boolean | No | App lock state. |

## Response

### Success Response

Update applied:

```json
{
  "name": "Updated App",
  "timezone": "Europe/Berlin",
  "edited_at": 1717600100
}
```

No-op update:

```json
{
  "result": "Nothing changed"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Raw update object that was persisted when update succeeds. |
| `edited_at` | Number | Update timestamp (seconds). |
| `result` | String | Present for no-op update branch (`Nothing changed`). |

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
  "result": "Invalid app name"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid app key"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid props: country,timezone"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "App key already in use"
}
```

**Status Code**: `401 Unauthorized`
```json
{
  "result": "User does not have admin rights for this app"
}
```

**Status Code**: `404 Not Found`
```json
{
  "result": "App not found"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Normal update | At least one valid update field is provided | Validates fields, checks key uniqueness when needed, updates app document, dispatches update integrations. | Raw object (updated fields + `edited_at`). |
| No-op | No effective update fields provided | Skips database write. | Wrapped string `{ "result": "Nothing changed" }`. |

### Impact on Other Data

- Dispatches app-update integration hooks so feature modules can react to app metadata changes.
- If app image is uploaded in the same request context, updates app image file.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication/authorization | Reads caller permissions and app-admin access rights. |
| `countly.apps` | App metadata update target | Reads existing app and updates selected app fields. |
| `countly_fs` | App image storage | Overwrites app image when an image file is supplied. |

---
## Examples

### Example 1: Update timezone and country

```plaintext
/i/apps/update?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&args={"app_id":"64b0ac10c2c3ce0012dd1001","timezone":"Europe/Berlin","country":"DE"}
```

### Example 2: Lock app

```plaintext
/i/apps/update?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&args={"app_id":"64b0ac10c2c3ce0012dd1001","locked":true}
```

## Limitations

- `args.app_id` is mandatory in payload.
- Invalid `type`, `country`, `timezone`, or `category` values are rejected.

---
## Related Endpoints

- [Apps - App Create](i-apps-create.md)
- [Apps - App Delete](i-apps-delete.md)
- [Apps - App Read Details](o-apps-details.md)

## Last Updated

2026-02-17