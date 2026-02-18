---
sidebar_label: "Note Save"
---

# Notes - Note Save

## Endpoint

```plaintext
/i/notes/save
```

## Overview

Creates a new note or updates an existing note.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires `core` create permission for the target app (`app_id`) or global admin access.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes for non-global-admin users | Target app ID used for permission validation. |
| `args` | JSON String (Object) | Yes | Note payload. |

### `args` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `note` | String | Yes | Note body text. |
| `ts` | Number | Yes | Timestamp used by notes filtering (Unix ms). |
| `noteType` | String | Yes | Note visibility type (for example `public`). |
| `color` | String | Yes | Note color identifier. |
| `category` | Boolean | No | Category flag. |
| `emails` | Array of String | No | Shared recipient emails for visibility. |
| `_id` | String | No | Existing note id; when provided, endpoint updates that note. |
| `app_id` | String | Yes | App id stored in the note document. |

Example `args` value:

```json
{
  "app_id": "6991c75b024cb89cdc04efd2",
  "note": "Traffic anomaly reviewed",
  "ts": 1739788800000,
  "noteType": "public",
  "color": "#F59E0B",
  "emails": ["ops@example.com"]
}
```

## Response

### Success Response

```json
{
  "result": "Success"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Operation status message. |

### Error Responses

**Status Code**: `403 Forbidden`

```json
{
  "result": "Not allow to edit note"
}
```

**Status Code**: `503 Service Unavailable`

```json
{
  "result": "Save note failed"
}
```

**Status Code**: `503 Service Unavailable`

```json
{
  "result": "Insert Note failed."
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Create note | `args._id` not provided | Reads latest note indicator for app, increments it, inserts new note. | Wrapped success/error message. |
| Update note | `args._id` provided | Validates edit permission, updates note fields (except owner/created timestamp). | Wrapped success/error message. |

### Impact on Other Data

- New-note mode reads existing note indicators for the same app to assign the next indicator value.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.notes` | Primary notes storage. | Reads latest indicator, inserts new notes, or updates existing notes. |

---

## Examples

### Example 1: Create note

```plaintext
/i/notes/save?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&args={"app_id":"6991c75b024cb89cdc04efd2","note":"Traffic anomaly reviewed","ts":1739788800000,"noteType":"public","color":"#F59E0B"}
```

```json
{
  "result": "Success"
}
```

### Example 2: Update note

```plaintext
/i/notes/save?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&args={"_id":"67b2fc5a7274b47fce18c301","app_id":"6991c75b024cb89cdc04efd2","note":"Updated note text","ts":1739788800000,"noteType":"public","color":"#22C55E"}
```

```json
{
  "result": "Success"
}
```

---

## Limitations

- Edit permission depends on note ownership and visibility (public/private).
- Invalid JSON in `args` can fail validation before note processing.

## Related Endpoints

- [Notes List](./o-notes.md)
- [Note Delete](./i-notes-delete.md)

## Last Updated

2026-02-17
