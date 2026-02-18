---
sidebar_label: "Export List"
---

# Data Migration - Get My Exports

## Endpoint

```text
/o/datamigration/getmyexports
```

## Overview

Returns migration export records with derived file-availability flags.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `data_migration` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `args` | JSON String (Object) | No | Optional JSON-stringified helper args. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Response

### Success Response

With exports:

```json
{
  "result": [
    {
      "_id": "f9b35d90be5f2240eafced7c6bfdf130856cd0a7",
      "step": "exporting",
      "status": "progress",
      "progress": 35,
      "can_download": false,
      "have_folder": true,
      "log": "dm-export_f9b35d90be5f2240eafced7c6bfdf130856cd0a7.log"
    }
  ]
}
```

No exports:

```json
{
  "result": "data-migration.no-exports"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Array or String | Export list or no-exports key. |
| `result[].can_download` | Boolean | Whether final archive file exists. |
| `result[].have_folder` | Boolean | Whether unpacked export folder exists. |
| `result[].log` | String | Export log filename if available. |

### Error Responses

- `404`

```json
{
  "result": "Database error message"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Export list | Records found in migration collection | Returns sorted list and annotates each record with file/log availability flags. | Wrapped result array |
| No exports | No records found | Returns no-exports key. | Wrapped string |

### Impact on Other Data

- Read-only endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.data_migrations` | Export status listing | Reads all migration records sorted by timestamp. |

---

## Examples

### List exports

```text
/o/datamigration/getmyexports
```

## Related Endpoints

- [Data Migration - Get Status](o-datamigration-getstatus.md)
- [Data Migration - Delete Export](i-datamigration-delete_export.md)

## Last Updated

2026-02-17
