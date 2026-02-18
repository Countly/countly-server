---
sidebar_label: "Preset Delete"
---

# /i/date_presets/delete

## Endpoint

```plaintext
/i/date_presets/delete
```

## Overview

Delete a date preset and compact `sort_order` for presets that were below it.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- App write permission is required for the provided `app_id`.
- Caller must be preset owner or a global admin.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | App ID used by write-access validation. |
| `preset_id` | String | Yes | Preset ID (24-char hex). |

## Response

### Success Response

```json
{
  "acknowledged": true,
  "deletedCount": 1
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `acknowledged` | Boolean | Delete operation acknowledgement flag. |
| `deletedCount` | Number | Number of deleted preset documents. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Not enough args"
}
```

**Status Code**: `401 Unauthorized`
```json
{
  "result": "Not authorized"
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "Could not find preset"
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "Error deleting preset"
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "Error updating sort order of other presets"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Authorized delete | Preset exists and caller is owner/global admin | Deletes preset, then decrements `sort_order` for presets with greater `sort_order`. | Raw object (Mongo delete result) |
| Unauthorized delete | Preset exists but caller is not owner and not global admin | Stops before deletion. | Wrapped object: `{ "result": "Not authorized" }` |

### Impact on Other Data

- Deletion updates the ordering of remaining presets by decrementing `sort_order` for entries below the deleted item.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.date_presets` | Preset lookup, deletion, and ordering compaction | Reads target preset by `_id`, deletes it, then updates other preset documents' `sort_order`. |
| `countly.members` | Authentication and caller identity resolution | Resolves `member._id` / `global_admin` context used for authorization checks. |

---
## Examples

### Example 1: Delete one preset

```plaintext
/i/date_presets/delete?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&preset_id=6992de8e6fbee4231c404429
```

## Limitations

- `app_id` is required for write-access validation, but deletion is keyed by `preset_id`.
- The `sort_order` compaction update is not filtered by app, so it affects all presets with greater `sort_order`.

---

## Related Endpoints

- [Date Presets - Preset Update](i-date-presets-update.md)
- [Date Presets - Preset Read All](o-date-presets-getall.md)

## Last Updated

2026-02-17