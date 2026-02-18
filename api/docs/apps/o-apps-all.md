---
sidebar_label: "App Read All"
---

# /o/apps/all

## Endpoint

```plaintext
/o/apps/all
```

## Overview

Return all apps as packed app maps for admin and user scopes.

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

## Response

### Success Response

```json
{
  "admin_of": {
    "64b0ac10c2c3ce0012dd1001": {
      "_id": "64b0ac10c2c3ce0012dd1001",
      "name": "My App",
      "key": "3a4f9d...",
      "country": "US",
      "timezone": "Etc/UTC",
      "category": "6",
      "salt": ""
    }
  },
  "user_of": {
    "64b0ac10c2c3ce0012dd1001": {
      "_id": "64b0ac10c2c3ce0012dd1001",
      "name": "My App",
      "key": "3a4f9d...",
      "country": "US",
      "timezone": "Etc/UTC",
      "category": "6",
      "salt": ""
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `admin_of` | Object | Packed app map keyed by app ID. |
| `user_of` | Object | Packed app map keyed by app ID. |
| `admin_of.<appId>` | Object | Packed app record. |
| `user_of.<appId>` | Object | Packed app record. |
| `salt` | String | App `salt` or legacy `checksum_salt` fallback. |

### Error Responses

Database read failure branch (still returns HTTP 200):

```json
{
  "admin_of": {},
  "user_of": {}
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Standard read | Apps query succeeds | Loads all app documents and packs them into two ID-keyed maps. | Raw object `{ admin_of, user_of }` |
| Fallback read | Apps query fails or returns no apps | Returns empty maps for both scopes. | Raw object `{ admin_of: {}, user_of: {} }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication | Reads caller identity for global-admin validation. |
| `countly.apps` | App list source | Reads all app documents and packs selected app fields for output. |

---
## Examples

### Example 1: Read all apps

```plaintext
/o/apps/all?api_key=YOUR_API_KEY
```

## Limitations

- Route is restricted to global admins.
- On query failure this handler still returns HTTP 200 with empty maps.

---
## Related Endpoints

- [Apps - App Read Mine](o-apps-mine.md)
- [Apps - App Read Details](o-apps-details.md)

## Last Updated

2026-02-17