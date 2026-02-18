---
sidebar_label: "Preset Read by ID"
---

# /o/date_presets/getById

## Endpoint

```plaintext
/o/date_presets/getById
```

## Overview

Returns one preset by ID when the caller has access through ownership or sharing.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires authenticated dashboard user.
- Access to the preset itself is filtered by owner/share rules.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `preset_id` | String | Yes | Preset ID (24-char hex). |
| `app_id` | String | Yes | Required by argument validation. |

## Response

### Success Response

```json
{
  "_id": "6992de8e6fbee4231c404429",
  "name": "Marketing Review",
  "range": ["7days", "today"],
  "share_with": "selected-users",
  "created_at": 1771232910,
  "edited_at": 1771234302,
  "owner_id": "6991c7de024cb89cdc04efd6",
  "fav": false,
  "shared_email_edit": ["editor@example.com"],
  "shared_email_view": ["viewer@example.com"],
  "shared_user_groups_edit": ["6992ad9f87f8467de103390a"],
  "shared_user_groups_view": [],
  "sort_order": 0,
  "is_owner": true
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `_id` | String | Preset ID. |
| `name` | String | Preset name. |
| `range` | String, Array, or Object | Stored period definition. |
| `share_with` | String | Sharing mode. |
| `created_at` | Number | Creation timestamp (seconds). |
| `edited_at` | Number | Last edit timestamp (seconds), when present. |
| `owner_id` | String | Owner member ID. |
| `fav` | Boolean | Whether current user marked this preset as favorite. |
| `shared_email_edit` | Array | Editable email list. |
| `shared_email_view` | Array | View email list. |
| `shared_user_groups_edit` | Array | Editable user-group list. |
| `shared_user_groups_view` | Array | View user-group list. |
| `sort_order` | Number | Display order. |
| `is_owner` | Boolean | True if caller owns preset or is global admin. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Not enough args"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "Could not find preset"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Accessible preset | Caller is global admin or matches owner/share rules | Loads preset, computes `is_owner`, converts `fav` to caller-specific boolean. | Raw preset object |
| Inaccessible/missing preset | No matching preset under visibility filter | Returns not-found branch. | Wrapped object: `{ "result": "Could not find preset" }` |

### Impact on Other Data

- This endpoint is read-only and does not modify stored data.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.date_presets` | Source of preset details | Reads one preset by `_id` with ownership/share filter and returns caller-adjusted view fields (`fav`, `is_owner`). |
| `countly.members` | Authentication and caller identity resolution | Resolves caller identity for ownership and sharing checks. |

---
## Examples

### Example 1: Read preset by ID

```plaintext
/o/date_presets/getById?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&preset_id=6992de8e6fbee4231c404429
```

## Limitations

- `app_id` is required by argument validation even though lookup is based on `preset_id` and visibility rules.
- Additional custom fields can appear if they were stored during preset create/update.

---

## Related Endpoints

- [Date Presets - Preset Read All](o-date-presets-getall.md)
- [Date Presets - Preset Update](i-date-presets-update.md)

## Last Updated

2026-02-17