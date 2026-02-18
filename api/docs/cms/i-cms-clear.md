---
sidebar_label: "Cache Clear"
---

# /i/cms/clear

## Endpoint

```plaintext
/i/cms/clear
```

## Overview

Clear CMS cache entries from `countly.cms_cache`.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires app-level write/admin access for `app_id`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | App ID used by write-permission validation. |
| `_id` | String | No | Cache ID prefix filter. When omitted, all CMS cache entries are deleted. |

## Response

### Success Response

```json
{
  "result": "CMS cache cleared"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Cache clear status message. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

**Status Code**: `401 Unauthorized`
```json
{
  "result": "User does not have right"
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "An error occured while clearing CMS cache: <error>"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Global cache clear | `_id` is omitted | Deletes all `cms_cache` documents. | Wrapped string: `{ "result": "CMS cache cleared" }` |
| Prefix cache clear | `_id` is provided | Deletes `cms_cache` documents where `_id` starts with the provided prefix. | Wrapped string: `{ "result": "CMS cache cleared" }` |

### Impact on Other Data

- Removes cache entries and related `_meta` entries from `countly.cms_cache`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app write permissions. |
| `countly.cms_cache` | Cache invalidation target | Deletes cache entries globally or by prefix. |

---
## Examples

### Example 1: Clear all CMS cache entries

```plaintext
/i/cms/clear?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2
```

### Example 2: Clear one CMS namespace

```plaintext
/i/cms/clear?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&_id=server-guides
```

## Limitations

- This endpoint removes cached entries only; it does not fetch fresh CMS data by itself.

---
## Related Endpoints

- [CMS - Entries Save](i-cms-save-entries.md)
- [CMS - Entries Read](o-cms-entries.md)

## Last Updated

2026-02-17