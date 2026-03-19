---
sidebar_label: "Entries Save"
---

# /i/cms/save_entries

## Endpoint

```plaintext
/i/cms/save_entries
```

## Overview

Save transformed CMS entries into `countly.cms_cache`.

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
| `_id` | String | No | Entry namespace prefix used by cache cleanup and meta marker updates (for example `server-guides`). |
| `entries` | JSON String (Array) | Yes | Array of transformed entry objects to store. |

### `entries` Array Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `[] ._id` | String | Yes | Cache document ID (for example `server-guides_123`). |
| `[] .*` | Any JSON type | No | Entry payload fields to store. |

## Response

### Success Response

```json
{
  "result": "Entries saved"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Save status message. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid entries parameter"
}
```

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
  "result": "Error occured when saving entries to DB: Write operation failed"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Standard save | Valid `entries` JSON and permissions | Parses entries, stamps `lu` on each record, upserts into cache, updates meta marker, removes older prefixed entries. | Wrapped string: `{ "result": "Entries saved" }` |

### Impact on Other Data

- Upserts cache entries in `countly.cms_cache`.
- Replaces meta marker document `${_id}_meta` with latest `lu` timestamp.
- Deletes older cache entries under the same `_id` prefix.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app write permissions. |
| `countly.cms_cache` | CMS cache persistence | Upserts provided entries, updates meta marker, and deletes old prefixed cache docs. |

---
## Examples

### Example 1: Save guides cache entries

```plaintext
/i/cms/save_entries?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&_id=server-guides&entries=[{"_id":"server-guides_1","title":"Guide 1","body":"Welcome"},{"_id":"server-guides_2","title":"Guide 2","body":"Advanced setup"}]
```

### Example 2: Save consent cache entries

```plaintext
/i/cms/save_entries?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&_id=server-consents&entries=[{"_id":"server-consents_10","title":"Consent v2","required":true}]
```

## Limitations

- `entries` must be valid JSON array data.
- Save flow assumes transformed entries already contain stable `_id` values.

---
## Related Endpoints

- [CMS - Entries Read](o-cms-entries.md)
- [CMS - Cache Clear](i-cms-clear.md)

## Last Updated

2026-02-17
