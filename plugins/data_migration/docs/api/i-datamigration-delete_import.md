---
sidebar_label: "Delete Import"
---

# Data Migration - Delete Import

## Endpoint

```text
/i/datamigration/delete_import
```

## Overview

Deletes local import artifacts for one import/export ID.

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
| `exportid` | String | Yes | Import/export identifier used by import workspace files. |
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
  "result": "data-migration.exportid-missing"
}
```

- `404`

```json
{
  "result": "data-migration.no-export-id-given"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Delete success | `exportid` provided and cleanup succeeds | Removes import archive/folder and related import metadata files/logs. | Wrapped `{ "result": "ok" }` |
| Missing ID | `exportid` absent/empty | Stops and returns missing-id key. | Wrapped error key |

### Impact on Other Data

- Deletes files in plugin import workspace.
- Deletes import log file and import metadata JSON when present.

## Database Collections

This endpoint does not read or write database collections directly.

---

## Examples

### Delete one import package

```text
/i/datamigration/delete_import?
  exportid=f9b35d90be5f2240eafced7c6bfdf130856cd0a7
```

## Related Endpoints

- [Data Migration - Get My Imports](o-datamigration-getmyimports.md)
- [Data Migration - Delete All Migration Files](i-datamigration-delete_all.md)

## Last Updated

2026-02-17
