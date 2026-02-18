---
sidebar_label: "Import Report"
---

# Data Migration - Report Import Status

## Endpoint

```text
/i/datamigration/report_import
```

## Overview

Receives import status updates from the target server and updates the originating export job state.

## Authentication

No user authentication validator is called in this handler. Access is controlled by matching:

- `exportid` and
- `token` (`server_token` stored in migration record).

## Permissions

No explicit permission check in this handler.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `exportid` | String | Yes | Export job ID in `countly.data_migrations`. |
| `token` | String | Yes | Server token that must match migration record `server_token`. |
| `status` | String | Yes | Import status value from target server (for example `finished`, `failed`). |
| `message` | String | No | Additional status reason/message. |
| `args` | JSON String (Object) | No | Optional JSON-stringified helper arguments. |

## Response

### Success Response

```json
{
  "result": "ok"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Status key/message. |

### Error Responses

- `404`

```json
{
  "result": "data-migration.exportid_not_provided"
}
```

- `404`

```json
{
  "result": "data-migration.token_missing"
}
```

- `404`

```json
{
  "result": "data-migration.export_not_found"
}
```

- `404`

```json
{
  "result": "data-migration.status-missing"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Finalized import callback | `status=finished` and valid token/export | Updates migration progress to `finished`, optionally applies app redirect URLs. | Wrapped `{ "result": "ok" }` |
| Non-finished callback | `status` present but not `finished` | Updates migration progress state using provided status/message. | No explicit success payload in this branch |
| Invalid callback | Missing/invalid `exportid`, `token`, or `status` | Stops and returns error key. | Wrapped error key in `result` |

### Impact on Other Data

- Updates migration state fields in `countly.data_migrations`.
- If redirect is enabled on completed import, updates `countly.apps.redirect_url` for exported apps.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `app_redirected` | Completed import with redirect enabled | `{ app_id, redirect_url }` |
| `export_finished` / `export_failed` | Migration progress reaches terminal state through progress updater | `{ app_ids, status, message }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.data_migrations` | Export/import state tracking | Reads migration by `_id` and `server_token`; updates status/step/progress fields. |
| `countly.apps` | Optional redirect handoff | Updates `redirect_url` for exported app IDs after successful import. |
| `countly.systemlogs` | Audit trail | Writes redirect and terminal export status actions. |

---

## Examples

### Report successful remote import

```text
/i/datamigration/report_import?
  exportid=f9b35d90be5f2240eafced7c6bfdf130856cd0a7&
  token=4f04966859f6eaec2f7164ca0a33ecb4&
  status=finished&
  message=Import complete
```

## Operational Considerations

- This endpoint is part of asynchronous cross-server migration workflow; it updates status but does not block on full import pipeline operations.

## Limitations

- For non-`finished` status values, the handler updates progress but does not send an explicit success body.

## Related Endpoints

- [Data Migration - Import](i-datamigration-import.md)
- [Data Migration - Get Status](o-datamigration-getstatus.md)

## Last Updated

2026-02-17
