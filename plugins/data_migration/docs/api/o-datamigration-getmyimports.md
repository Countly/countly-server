---
sidebar_label: "Import List"
---

# Data Migration - Get My Imports

## Endpoint

```text
/o/datamigration/getmyimports
```

## Overview

Returns discovered import artifacts by scanning import and log directories.

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

With imports:

```json
{
  "result": {
    "f9b35d90be5f2240eafced7c6bfdf130856cd0a7": {
      "type": "archive",
      "log": "dm-import_f9b35d90be5f2240eafced7c6bfdf130856cd0a7.log",
      "last_update": "2026-02-17T14:28:00.000Z",
      "app_list": "Production App"
    }
  }
}
```

No imports:

```json
{
  "result": "data-migration.no-imports"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Object or String | Import map keyed by import ID, or no-imports key. |
| `result.by_id.type` | String | `archive` or `folder` depending on import artifact type. |
| `result.by_id.log` | String | Associated import log filename if found. |
| `result.by_id.last_update` | String | Last access/update timestamp from log stats when available. |
| `result.by_id.app_list` | String | Imported app names from import metadata JSON when available. |

### Error Responses

This handler primarily returns success keys and does filesystem scanning; explicit error responses are not defined for most scan failures.

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Imports found | Import/log artifacts detected | Builds import map from directory and metadata/log files. | Wrapped object map |
| No imports | No artifacts detected | Returns no-imports key. | Wrapped string |

### Impact on Other Data

- Read-only endpoint.

## Database Collections

This endpoint does not read or write database collections directly.

---

## Examples

### List imports

```text
/o/datamigration/getmyimports
```

## Related Endpoints

- [Data Migration - Import](i-datamigration-import.md)
- [Data Migration - Delete Import](i-datamigration-delete_import.md)

## Last Updated

2026-02-17
