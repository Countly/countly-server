---
sidebar_label: "Import Start"
---

# Data Migration - Import

## Endpoint

```text
/i/datamigration/import
```

## Overview

Starts a migration import from an uploaded archive file or an existing server file path.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

This endpoint also supports scoped import tokens created by `o/datamigration/createimporttoken`.

## Permissions

Requires `data_migration` `Create` permission (or valid scoped import token for this route).

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `import_file` | File | Conditional | Migration archive file upload (`.tar.gz`) when importing via upload. |
| `existing_file` | String | Conditional | Full path to existing import archive on server. |
| `test_con` | Number/String | No | If provided, endpoint only validates connectivity and returns `valid`. |
| `exportid` | String | No | Export ID hint used in import flow metadata. |
| `args` | JSON String (Object) | No | Optional JSON-stringified helper args. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided and no scoped token is used. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided and no scoped token is used. |

## Response

### Success Response

Connectivity test mode:

```json
{
  "result": "valid"
}
```

Import started:

```json
{
  "result": "data-migration.import-started"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Status key for import test/start or error details. |

### Error Responses

- `404`

```json
{
  "result": "data-migration.import-file-missing"
}
```

- `404`

```json
{
  "result": "data-migration.could-not-find-file"
}
```

- `404`

```json
{
  "result": "data-migration.import-process-exist"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Connection test | `test_con` provided | Skips import and validates route reachability. | Wrapped `{ "result": "valid" }` |
| Upload import | `import_file` provided | Returns start message, then imports asynchronously in background. | Wrapped start status key |
| Existing-file import | `existing_file` provided and exists | Returns start message, then imports asynchronously from file path. | Wrapped start status key |

### Impact on Other Data

- Creates/imports files under plugin import workspace.
- Runs background import that can write to many Countly collections for migrated apps.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `import_finished` / `import_failed` | Background import completion/failure | Import app IDs/names and export ID context |
| `import_finished_response_ok` / `import_finished_response_failed` | Remote callback reporting outcome | Callback delivery metadata |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.data_migrations` | Migration status tracking (via helper progress/report flow) | Updates/creates migration status records during import lifecycle. |
| `countly.systemlogs` | Audit trail | Writes import lifecycle actions. |
| `countly.*` and `countly_drill.*` | Imported app data targets | Background import writes migrated application data into corresponding collections. |

---

## Examples

### Start import from uploaded archive

```text
/i/datamigration/import?
  exportid=f9b35d90be5f2240eafced7c6bfdf130856cd0a7
```

### Validate remote import token connection

```text
/i/datamigration/import?
  test_con=1
```

### Start import from existing server file

```text
/i/datamigration/import?
  existing_file=/var/backups/countly/f9b35d90be5f2240eafced7c6bfdf130856cd0a7.tar.gz
```

## Operational Considerations

- Import processing is asynchronous; HTTP response confirms start, not completion.
- Large imports can take significant time and are tracked through migration status and logs.

## Limitations

- Upload/import can be blocked by server file-size limits (for example web-server body-size settings).
- Import lock checks prevent duplicate active import processes for the same export folder name.

## Related Endpoints

- [Data Migration - Create Import Token](o-datamigration-createimporttoken.md)
- [Data Migration - Get Status](o-datamigration-getstatus.md)

## Last Updated

2026-02-17
