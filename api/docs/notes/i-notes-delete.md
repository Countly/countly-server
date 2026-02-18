---
sidebar_label: "Note Delete"
---

# Notes - Note Delete

## Endpoint

```plaintext
/i/notes/delete
```

## Overview

Deletes a note by `note_id` after permission checks.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires `core` delete permission for the target app (`app_id`) or global admin access.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes for non-global-admin users | Target app ID used for permission validation. |
| `note_id` | String | Yes | Note id to delete. |

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
  "result": "Not allow to delete this note"
}
```

**Status Code**: `503 Service Unavailable`

```json
{
  "result": "Error deleting note"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Successful delete | User has note-level delete permission | Removes note by `_id`. | Wrapped success message. |
| Permission denied | User not eligible to delete the note | No delete; returns forbidden message. | Wrapped error message. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.notes` | Primary notes storage. | Reads note for permission check, removes note by id. |

---

## Examples

### Example 1: Delete note

```plaintext
/i/notes/delete?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&note_id=67b2fc5a7274b47fce18c301
```

```json
{
  "result": "Success"
}
```

---

## Limitations

- Only eligible users can delete: note owner, app admin/global admin for public notes.
- Use `note_id` for deletion. Passing only `args._id` is not sufficient for delete execution.

## Related Endpoints

- [Note Save](./i-notes-save.md)
- [Notes List](./o-notes.md)

## Last Updated

2026-02-17
