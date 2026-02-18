---
sidebar_label: "Features List"
---

# /o/plugins

## Endpoint

```plaintext
/o/plugins
```

## Overview

Returns available feature definitions by combining filesystem plugin metadata with current feature-state flags stored in the database.

## Authentication

Countly API supports three authentication methods:

1. **API Key** (parameter): `api_key=YOUR_API_KEY`
2. **Auth Token** (parameter): `auth_token=YOUR_AUTH_TOKEN`
3. **Auth Token** (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Required permission: Global Admin.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `member.lang` | `en` | Response content | For disabled features, localized title/description resolution uses the member language when matching localization files exist. |

## Response

### Success Response

```json
[
  {
    "enabled": true,
    "code": "drill",
    "title": "Drill",
    "name": "drill",
    "description": "Advanced event drill queries",
    "version": "24.05.0",
    "author": "Countly",
    "homepage": "https://count.ly",
    "cly_dependencies": {}
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Array | Raw array of feature metadata objects. |
| `[].enabled` | Boolean | Current enabled state from stored feature flags. |
| `[].code` | String | Feature code (directory name). |
| `[].title` | String | Display title. |
| `[].name` | String | Package name. |
| `[].description` | String | Feature description. |
| `[].version` | String | Feature version string. |
| `[].author` | String | Feature author metadata. |
| `[].homepage` | String | Feature homepage metadata. |
| `[].cly_dependencies` | Object | Feature dependency metadata from package metadata. |
| `[].prepackaged` | Boolean | Present in enclose builds when prepackaged metadata exists. |

### Error Responses

`400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

`400 Bad Request`

```json
{
  "result": "Token not valid"
}
```

`401 Unauthorized`

```json
{
  "result": "User does not exist"
}
```

`401 Unauthorized`

```json
{
  "result": "User does not have right"
}
```

`401 Unauthorized`

```json
{
  "result": "User is locked"
}
```

`401 Unauthorized`

```json
{
  "result": "Token is invalid"
}
```

## Behavior/Processing

- Reads `_id: "plugins"` state map from database.
- Enumerates plugin directories and package metadata.
- Builds response entries only for known plugin keys.
- Adds localization fallback for disabled features when localization files are present.
- Returns metadata array as raw root output.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Global-admin validation | Reads authenticated user and global-admin status. |
| `countly.plugins` | Stores current feature enablement map | Reads `plugins.{feature_code}` flags under `_id: "plugins"`. |

## Examples

### List all features and states

```plaintext
/o/plugins?api_key=YOUR_API_KEY
```

## Limitations

- No pagination/filter parameters; full list is returned.
- Metadata quality depends on each feature's package/localization files.

## Related Endpoints

- [Features - Feature State Update](i-plugins.md)
- [Features - Feature State Check](o-plugins-check.md)

## Last Updated

2026-02-17
