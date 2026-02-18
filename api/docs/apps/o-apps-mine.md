---
sidebar_label: "App Read Mine"
---

# /o/apps/mine

## Endpoint

```plaintext
/o/apps/mine
```

## Overview

Return apps accessible to the authenticated user, split by admin scope and user scope.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Any authenticated dashboard user.

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
  "user_of": {}
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `admin_of` | Object | Packed app map for apps where user has admin-level access. |
| `user_of` | Object | Packed app map for apps where user has user-level access. |
| `admin_of.<appId>` | Object | Packed app record for admin scope. |
| `user_of.<appId>` | Object | Packed app record for user scope. |

### Error Responses

This endpoint does not define custom non-auth business errors. Authentication/authorization layer errors apply.

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Global admin mode | Caller is global admin | Delegates to full app list behavior. | Raw object `{ admin_of, user_of }` |
| Scoped member mode | Caller is not global admin | Loads apps from member `admin_of` and `user_of` scopes and packs results. | Raw object `{ admin_of, user_of }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and app scope resolution | Reads caller member permissions and app scope lists. |
| `countly.apps` | App metadata source | Reads app documents for IDs allowed to the caller. |

---
## Examples

### Example 1: Read current user app scopes

```plaintext
/o/apps/mine?api_key=YOUR_API_KEY
```

## Limitations

- Response is map-based, not paginated arrays.

---
## Related Endpoints

- [Apps - App Read All](o-apps-all.md)
- [Apps - App Read Details](o-apps-details.md)

## Last Updated

2026-02-17