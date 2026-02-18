---
sidebar_label: "Preset Update"
---

# /i/date_presets/update

## Endpoint

```plaintext
/i/date_presets/update
```

## Overview

Update date preset fields including sharing, favorites, and sort order.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- App write permission is required for the provided `app_id`.
- Preset must be accessible to caller through owner/share filters.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | App ID used by write-access validation. |
| `preset_id` | String | Yes | Preset ID (24-char hex). |
| `name` | String | No | Updated preset name. |
| `range` | JSON String (Array or Object) | No | Updated range definition (JSON-parseable string). |
| `share_with` | String | No | Updated sharing mode. |
| `shared_email_edit` | JSON String (Array) | No | Updated edit email list. |
| `shared_email_view` | JSON String (Array) | No | Updated view email list. |
| `shared_user_groups_edit` | JSON String (Array) | No | Updated edit group list. |
| `shared_user_groups_view` | JSON String (Array) | No | Updated view group list. |
| `exclude_current_day` | JSON String (Boolean) | No | Updated current-day exclusion flag. |
| `fav` | JSON String (Boolean) | No | Toggle favorite flag for current member. |
| `sort_order` | JSON String (Number) | No | Updated order index. |

## Response

### Success Response

```json
{
  "result": "Preset updated"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Update outcome string. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid range"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid shared_email_edit"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid shared_email_view"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid shared_user_groups_edit"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid shared_user_groups_view"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid exclude_current_day"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid fav"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Invalid sort_order"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Not enough args"
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
  "result": "Error updating preset"
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
| Standard update | Valid preset and update payload | Applies field updates, sets `edited_at`, updates preset record. | Wrapped string `{ "result": "Preset updated" }` |
| Sort reorder update | `sort_order` changed | Updates preset and shifts neighbor presets to maintain contiguous ordering. | Wrapped string `{ "result": "Preset updated" }` |
| Favorite toggle update | `fav` provided | Adds/removes caller member ID from preset `fav` list before update. | Wrapped string `{ "result": "Preset updated" }` |

### Impact on Other Data

- Updates neighboring preset documents when `sort_order` changes.
- Favorite updates are user-specific and mutate shared `fav` array stored on preset.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and share-scope evaluation | Reads caller identity and share visibility scope. |
| `countly.date_presets` | Preset update target | Reads current preset and updates preset fields/sort ordering. |

---
## Examples

### Example 1: Update name and share mode

```plaintext
/i/date_presets/update?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&preset_id=6992de8e6fbee4231c404429&name=Executive 30-Day View&share_with=all-users
```

### Example 2: Mark preset as favorite

```plaintext
/i/date_presets/update?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&preset_id=6992de8e6fbee4231c404429&fav=true
```

## Limitations

- Additional top-level request fields (except `preset_id`, `fav`, `app_id`) are copied into stored preset object.
- When `share_with` is not `selected-users`, shared email/group lists are cleared.
- Sort-order reindexing after reorder is global within `countly.date_presets` (not app-scoped).

---
## Related Endpoints

- [Date Presets - Preset Create](i-date-presets-create.md)
- [Date Presets - Preset Delete](i-date-presets-delete.md)
- [Date Presets - Preset Read by ID](o-date-presets-getbyid.md)

## Last Updated

2026-02-17