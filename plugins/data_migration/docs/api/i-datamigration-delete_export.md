---
sidebar_label: "Delete Export"
---

# Data Migration - Delete Export

## Endpoint

```text
/i/datamigration/delete_export
```

## Overview

Deletes one export package and its migration record.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `data_migration` `Delete` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `exportid` | String | Yes | Export job ID. |
| `args` | JSON String (Object) | No | Optional JSON-stringified helper args. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

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
| `result` | String | Operation status key. |

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
  "result": "data-migration.invalid-exportid"
}
```

- `401`

```json
{
  "result": "data-migration.unable-to-delete-log-file"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Delete success | Valid `exportid` record found | Cleans export archive/folder, removes export log file, removes DB record. | Wrapped `{ "result": "ok" }` |
| Invalid export | Missing or unknown `exportid` | Stops and returns invalid/missing key. | Wrapped error key |

### Impact on Other Data

- Deletes export files under plugin export workspace.
- Deletes export record from `countly.data_migrations`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.data_migrations` | Export metadata lookup and delete | Reads export by `_id`; removes matching migration document. |

---

## Examples

### Delete one export package

```text
/i/datamigration/delete_export?
  exportid=f9b35d90be5f2240eafced7c6bfdf130856cd0a7
```

## Limitations

- If log-file deletion fails, endpoint returns error and export DB cleanup may not complete.

## Related Endpoints

- [Data Migration - Get My Exports](o-datamigration-getmyexports.md)
- [Data Migration - Delete All Migration Files](i-datamigration-delete_all.md)

## Last Updated

2026-02-17
