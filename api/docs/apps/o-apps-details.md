---
sidebar_label: "App Read Details"
---

# /o/apps/details

## Endpoint

```plaintext
/o/apps/details
```

## Overview

Return app detail block, resolved owner display name, and member lists for global admins, app admins, and app users.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- App admin (or global admin) access to the target app is required.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | Target app ID. |

## Response

### Success Response

```json
{
  "app": {
    "owner": "Global Admin",
    "owner_id": "64afcc1a4f5f0f0012a11101",
    "created_at": 1717600000,
    "edited_at": 1717600100,
    "plugins": {},
    "last_data": 1717600200,
    "last_data_users": 1717600300
  },
  "global_admin": [
    {
      "full_name": "Global Admin",
      "username": "admin"
    }
  ],
  "admin": [],
  "user": []
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `app` | Object | Core app metadata block. |
| `app.owner` | String | Owner display name derived from member document or empty string. |
| `app.owner_id` | String | Owner member ID. |
| `app.created_at` | Number | App creation timestamp (seconds). |
| `app.edited_at` | Number | Last app edit timestamp (seconds). |
| `app.plugins` | Object | App-level plugin configuration object. |
| `app.last_data` | Number | Last app data timestamp stored on app record. |
| `app.last_data_users` | Number | Most recent app-user activity timestamp (`lac`) from app-user collection. |
| `global_admin` | Array of Objects | List of global admin members. |
| `admin` | Array of Objects | List of app admins for this app. |
| `user` | Array of Objects | List of app users for this app. |

### Error Responses

**Status Code**: `401 Unauthorized`
```json
{
  "result": "No app_id provided"
}
```

**Status Code**: `401 Unauthorized`
```json
{
  "result": "App does not exist"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Details read | Valid app and permissions | Loads app, resolves owner display, loads member role lists, loads latest app-user activity. | Raw object `{ app, global_admin, admin, user }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.apps` | App metadata source | Reads target app document and plugin configuration. |
| `countly.app_users{appId}` | Activity recency lookup | Reads highest `lac` value to populate `last_data_users`. |
| `countly.members` | Owner and role list enrichment | Reads owner, global admin, app admin, and app user member records. |

---
## Examples

### Example 1: Read app details

```plaintext
/o/apps/details?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001
```

## Limitations

- Owner is returned as display text, not full owner profile object.

---
## Related Endpoints

- [Apps - App Read All](o-apps-all.md)
- [Apps - App Read Mine](o-apps-mine.md)
- [Apps - App Read Plugins](o-apps-plugins.md)

## Last Updated

2026-02-17