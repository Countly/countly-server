---
sidebar_label: "Preset Read All"
---

# /o/date_presets/getAll

## Endpoint

```plaintext
/o/date_presets/getAll
```

## Overview

Returns all presets visible to the current user, including ownership and sharing metadata.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires authenticated dashboard user.
- Visibility is filtered by ownership and sharing rules.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |

## Response

### Success Response

```json
[
  {
    "_id": "695bc298dba3122bdb80ca9f",
    "name": "Bobs presetrrr",
    "range": "30days",
    "share_with": "all-users",
    "shared_email_edit": [],
    "shared_email_view": [],
    "shared_user_groups_edit": [],
    "shared_user_groups_view": [],
    "exclude_current_day": false,
    "owner_id": "695ba9d1a8e51e0d4609b712",
    "owner_name": "Bob",
    "fav": false,
    "is_owner": true,
    "created_at": 1767621272,
    "edited_at": 1767626262,
    "sort_order": 0
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | List of visible presets for current user. |
| `[] ._id` | String | Preset ID. |
| `[] .name` | String | Preset name. |
| `[] .range` | String, Array, or Object | Period definition stored in preset. |
| `[] .share_with` | String | Sharing mode (`none`, `all-users`, `selected-users`, etc.). |
| `[] .shared_email_edit` | Array or Boolean | Editable email list when allowed; otherwise `false`. |
| `[] .shared_email_view` | Array or Boolean | View email list when allowed; otherwise `false`. |
| `[] .shared_user_groups_edit` | Array or Boolean | Editable group list when allowed; otherwise `false`. |
| `[] .shared_user_groups_view` | Array or Boolean | View group list when allowed; otherwise `false`. |
| `[] .exclude_current_day` | Boolean | Exclude current day flag. |
| `[] .owner_id` | String | Owner member ID. |
| `[] .owner_name` | String | Owner full name from `members`. |
| `[] .fav` | Boolean | Whether current user marked preset as favorite. |
| `[] .is_owner` | Boolean | Whether current user is owner (or global admin). |
| `[] .created_at` | Number | Creation timestamp (seconds). |
| `[] .edited_at` | Number | Last edit timestamp (seconds), when present. |
| `[] .sort_order` | Number | Display order among presets. |

### Error Responses

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "Error getting presets"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Global admin listing | Caller is global admin | Returns all presets without ownership/share filtering. | Raw array of preset objects |
| Scoped listing | Caller is not global admin | Returns only presets visible by owner/share rules (owner, all-users, shared emails, or shared groups). | Raw array of preset objects |

### Impact on Other Data

- This endpoint is read-only and does not modify stored data.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.date_presets` | Source of stored date presets | Reads preset metadata and sharing fields, sorted by `sort_order`. |
| `countly.members` | Owner name enrichment | Looks up preset owner profile to return `owner_name`. |

---
## Examples

### Example 1: Read all visible presets

```plaintext
/o/date_presets/getAll?api_key=YOUR_API_KEY
```

---

## Related Endpoints

- [Date Presets - Preset Read by ID](o-date-presets-getbyid.md)
- [Date Presets - Preset Create](i-date-presets-create.md)

## Last Updated

2026-02-17