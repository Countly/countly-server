---
sidebar_label: "Delete All Files"
---

# Data Migration - Delete All Migration Files

## Endpoint

```text
/i/datamigration/delete_all
```

## Overview

Deletes all local export and import file directories for the Data Migration feature.

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
| `result` | String | Operation result key. |

### Error Responses

- `404`

```json
{
  "result": "Unable to remove directory"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Cleanup success | Filesystem remove operations succeed | Removes export and import directories if present. | Wrapped `{ "result": "ok" }` |
| Cleanup failure | Filesystem remove operation fails | Stops and returns cleanup error text. | Wrapped error text |

### Impact on Other Data

- Deletes local migration files/folders in plugin workspace.
- Does not remove existing migration records from `countly.data_migrations`.

## Database Collections

This endpoint does not read or write database collections directly.

---

## Examples

### Delete all migration import/export files

```text
/i/datamigration/delete_all
```

## Limitations

- This endpoint only cleans file system artifacts; database status records remain unless removed by other endpoints.

## Related Endpoints

- [Data Migration - Delete Export](i-datamigration-delete_export.md)
- [Data Migration - Delete Import](i-datamigration-delete_import.md)

## Last Updated

2026-02-17
