---
sidebar_label: "Notes List"
---

# Notes - Notes List

## Endpoint

```plaintext
/o/notes
```

## Overview

Returns a permission-filtered, paginated notes list for selected apps and period.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires `core` read permission for scoped apps.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes for non-global-admin users | App id used by read-permission validation layer. |
| `period` | String | Yes | Countly period format (for example `30days` or `[startTs,endTs]`). |
| `notes_apps` | JSON String (Array) | No | App IDs to query. If empty/missing, server resolves apps from user access. |
| `category` | JSON String (Array) | No | Category filter list. |
| `note_type` | String | No | Note type filter (for example `public`). |
| `sSearch` | String | No | Case-insensitive text search in `note`. |
| `iDisplayStart` | Number | No | Pagination offset. Default `0`. |
| `iDisplayLength` | Number | No | Page size. Default `5000`. |
| `iSortCol_0` | String | No | Sort column index (`2` => `ts`, `3` => `noteType`). |
| `sSortDir_0` | String | No | Sort direction (`asc` or `desc`). |
| `sEcho` | Number | No | Echo value returned unchanged. |

## Response

### Success Response

```json
{
  "aaData": [
    {
      "_id": "67b2fc5a7274b47fce18c301",
      "app_id": "6991c75b024cb89cdc04efd2",
      "note": "Traffic anomaly reviewed",
      "ts": 1739788800000,
      "noteType": "public",
      "emails": ["ops@example.com"],
      "color": "#F59E0B",
      "category": true,
      "owner": "67b1d21f1c8b2b714d99e001",
      "created_at": 1739788901200,
      "updated_at": 1739788901200,
      "indicator": "D",
      "owner_name": "Operations Admin"
    }
  ],
  "iTotalDisplayRecords": 1,
  "iTotalRecords": 1,
  "sEcho": 1
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `aaData` | Array | Notes rows matching permissions and filters. |
| `aaData[]._id` | String | Note ID. |
| `aaData[].app_id` | String | App ID associated with note. |
| `aaData[].note` | String | Note text. |
| `aaData[].ts` | Number | Note timestamp used for period filtering. |
| `aaData[].noteType` | String | Visibility/type value. |
| `aaData[].emails` | Array of String | Email-shared recipients. |
| `aaData[].owner` | String | Owner dashboard user id. |
| `aaData[].owner_name` | String | Owner display name resolved from `countly.members`. |
| `iTotalDisplayRecords` | Number | Total records after current filters. |
| `iTotalRecords` | Number | Same value as display count in this handler. |
| `sEcho` | Number | Echo value from request. |

### Error Responses

**Status Code**: `503 Service Unavailable`

```json
{
  "result": "fatch notes failed"
}
```

**Status Code**: `503 Service Unavailable`

```json
{
  "result": "fatch countly members for notes failed"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Matching notes found | Query returns records | Table payload with populated `aaData`. |
| No matching notes | Query count is zero | `aaData: []` with zero totals. |
| Query failure | Notes/member query fails | Wrapped error message. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.notes` | Main notes source. | Reads notes by app scope, period, visibility, and filters. |
| `countly.members` | Owner enrichment source. | Reads member full names for `owner_name` enrichment. |

---

## Examples

### Example 1: Read notes for selected apps

```plaintext
/o/notes?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&period=30days&notes_apps=["6991c75b024cb89cdc04efd2"]&iDisplayStart=0&iDisplayLength=50&sEcho=1
```

```json
{
  "aaData": [
    {
      "note": "Traffic anomaly reviewed",
      "owner_name": "Operations Admin"
    }
  ],
  "iTotalDisplayRecords": 1,
  "iTotalRecords": 1,
  "sEcho": 1
}
```

### Example 2: Read only public notes in category set

```plaintext
/o/notes?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&period=30days&note_type=public&category=[true]&iDisplayStart=0&iDisplayLength=20&sEcho=2
```

---

## Operational Considerations

- Very large `iDisplayLength` values can increase query and enrichment cost.
- Notes are enriched with owner names using an additional members lookup.

## Limitations

- `category` and `notes_apps` must be valid JSON strings when provided.
- Results are restricted by visibility rules: owner, public note, or email sharing.

## Related Endpoints

- [Note Save](./i-notes-save.md)
- [Note Delete](./i-notes-delete.md)

## Last Updated

2026-02-17
