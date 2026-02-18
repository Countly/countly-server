---
sidebar_label: "Preset Create"
---

# /i/date_presets/create

## Endpoint

```plaintext
/i/date_presets/create
```

## Overview

Create a date preset with ownership, sharing metadata, favorite list, and display order.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- App write permission is required for the provided `app_id`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | App ID used by write-access validation. |
| `name` | String | Yes | Preset name. |
| `range` | JSON String (Array or Object) | Yes | Date-range definition. Must be JSON-parseable. If parsed value is an array, it must contain exactly 2 elements. |
| `share_with` | String | Yes | Sharing mode. |
| `shared_email_edit` | JSON String (Array) | No | Shared edit email list. |
| `shared_email_view` | JSON String (Array) | No | Shared view email list. |
| `shared_user_groups_edit` | JSON String (Array) | No | Shared edit group list. |
| `shared_user_groups_view` | JSON String (Array) | No | Shared view group list. |
| `exclude_current_day` | JSON String (Boolean) | No | Current-day exclusion flag (`true` or `false`). |

## Response

### Success Response

```json
{
  "_id": "6992de8e6fbee4231c404429",
  "name": "Last 7 Days vs Today",
  "range": ["7days", "today"],
  "share_with": "none",
  "created_at": 1771232910,
  "owner_id": "6991c7de024cb89cdc04efd6",
  "fav": [],
  "shared_email_edit": [],
  "shared_email_view": [],
  "shared_user_groups_edit": [],
  "shared_user_groups_view": [],
  "sort_order": 0
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `_id` | String | New preset ID. |
| `name` | String | Preset name. |
| `range` | String, Array, or Object | Stored range definition. |
| `share_with` | String | Sharing mode. |
| `created_at` | Number | Creation timestamp (seconds). |
| `owner_id` | String | Creator member ID. |
| `fav` | Array | Favorite member list (initialized empty). |
| `shared_email_edit` | Array | Edit-share email list. |
| `shared_email_view` | Array | View-share email list. |
| `shared_user_groups_edit` | Array | Edit-share group list. |
| `shared_user_groups_view` | Array | View-share group list. |
| `sort_order` | Number | Display order index after insertion. |

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
  "result": "Not enough args"
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "Error updating sort order of other presets"
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "Error adding preset"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Selected-user share mode | `share_with=selected-users` | Preserves provided shared email/group lists. | Raw preset object |
| Non-selected share mode | `share_with` is not `selected-users` | Clears shared email/group lists before insert. | Raw preset object |

### Impact on Other Data

- Inserts new preset at top order (`sort_order=0`) and increments `sort_order` for existing presets.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication | Reads caller member identity for write validation and owner assignment. |
| `countly.date_presets` | Preset creation target | Inserts new preset and updates `sort_order` of other presets. |

---
## Examples

### Example 1: Create private preset

```plaintext
/i/date_presets/create?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&name=Last 7 Days vs Today&range=["7days","today"]&share_with=none
```

### Example 2: Create selected-users shared preset

```plaintext
/i/date_presets/create?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&name=Marketing Review&range=["30days","today"]&share_with=selected-users&shared_email_view=["analyst@example.com"]
```

## Limitations

- `range` array must contain exactly 2 entries.
- Additional top-level request fields (except `app_id`) are copied into stored preset object.
- Sort-order reindexing after insert is global within `countly.date_presets` (not app-scoped).

---
## Related Endpoints

- [Date Presets - Preset Update](i-date-presets-update.md)
- [Date Presets - Preset Read All](o-date-presets-getall.md)

## Last Updated

2026-02-17