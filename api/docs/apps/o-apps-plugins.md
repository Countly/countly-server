---
sidebar_label: "App Read Plugins"
---

# /o/apps/plugins

## Endpoint

```plaintext
/o/apps/plugins
```

## Overview

Return app-level plugin configuration either as a full plugin map or a single plugin entry.

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
| `app_id` | String | Yes | Target app ID. |
| `name` | String | No | Plugin name filter. |

## Response

### Success Response

Full map response:

```json
{
  "plugins": {
    "push": {
      "gateway": "fcm"
    },
    "ab-testing": {
      "enabled": true
    }
  }
}
```

Single plugin response:

```json
{
  "plugins": {
    "push": {
      "gateway": "fcm"
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `plugins` | Object | App plugin configuration object. |
| `plugins.[pluginName]` | Object | Configuration for each plugin key. |

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
  "result": "Error getting app plugins:"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Full config read | `name` is missing | Returns full `app.plugins` object for app. | Raw object `{ plugins: {...} }` |
| Single config read | `name` exists and target plugin key exists | Returns one plugin key/value under `plugins`. | Raw object `{ plugins: { name: {...} } }` |
| Name fallback | `name` provided but plugin key does not exist | Falls back to full `app.plugins` output. | Raw object `{ plugins: {...} }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication | Reads caller identity for global-admin validation. |
| `countly.apps` | Plugin config source | Reads app document and returns `plugins` object data. |

---
## Examples

### Example 1: Read all plugin configs

```plaintext
/o/apps/plugins?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001
```

### Example 2: Read one plugin config

```plaintext
/o/apps/plugins?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&name=push
```

## Limitations

- Route is restricted to global admins.
- Unknown `name` value returns full plugin map rather than an empty object.

---
## Related Endpoints

- [Apps - App Read Details](o-apps-details.md)
- [Apps - App Update](i-apps-update.md)

## Last Updated

2026-02-17
