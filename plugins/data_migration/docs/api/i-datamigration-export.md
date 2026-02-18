---
sidebar_label: "Export Start"
---

# Data Migration - Export

## Endpoint

```text
/i/datamigration/export
```

## Overview

Starts export generation for one or more apps. It can:

- generate export archive only,
- generate shell commands only,
- or generate and send export to another server.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `data_migration` `Create` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `apps` | String | Yes | Comma-separated app IDs to export. |
| `only_export` | Number/String | No | `1` = export only, `2` = export commands only, other values = export + send. |
| `server_token` | String | Conditional | Required when sending export to remote server (`only_export` not `1` or `2`). |
| `server_address` | String | Conditional | Required when sending export to remote server. |
| `target_path` | String | No | Server-side path for export archive output. |
| `aditional_files` | Number/String | No | `1` enables additional file export (for example symbolication files). |
| `redirect_traffic` | Number/String | No | `1` enables redirect handoff metadata for completion flow. |
| `args` | JSON String (Object) | No | Optional JSON-stringified helper args. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Response

### Success Response

Archive mode (`only_export=1` or remote-send mode):

```json
{
  "result": "f9b35d90be5f2240eafced7c6bfdf130856cd0a7"
}
```

Command mode (`only_export=2`):

```text
mongodump '...'
mongodump '...'
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Export ID for archive/generate-send modes. |
| `(root value)` | Text | Raw command script text in command mode (`returnRaw`). |

### Error Responses

- `404`

```json
{
  "result": "data-migration.no_app_ids"
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
  "result": "data-migration.address_missing"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Export commands only | `only_export=2` | Generates command list and returns downloadable text content. | Raw text payload |
| Export archive only | `only_export=1` | Generates export package and records status in migration tracking. | Wrapped export ID |
| Export and send | `only_export` missing or other value | Validates remote token/address, generates package, and sends asynchronously. | Wrapped export ID |

### Impact on Other Data

- Creates/updates migration status records in `countly.data_migrations`.
- Creates export artifacts under plugin export workspace.
- Asynchronous lifecycle updates can trigger send/import phases.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `export_finished` / `export_failed` | Export lifecycle reaches terminal state | `{ app_ids, status, message }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.data_migrations` | Export lifecycle tracking | Creates/updates export state (`step`, `status`, `progress`, app list, remote send metadata). |
| `countly.systemlogs` | Audit trail | Writes terminal export status actions via progress updater. |
| `countly.*` and `countly_drill.*` | Export data source | Reads selected app data for package generation. |

---

## Examples

### Export archive only

```text
/i/datamigration/export?
  apps=6991c75b024cb89cdc04efd2&
  only_export=1
```

### Generate export commands only

```text
/i/datamigration/export?
  apps=6991c75b024cb89cdc04efd2&
  only_export=2
```

### Export and send to remote server

```text
/i/datamigration/export?
  apps=6991c75b024cb89cdc04efd2&
  server_address=http://target-countly.example.com&
  server_token=2fc9d68f6f284f9fa95b93b7d598
```

## Operational Considerations

- Export processing is asynchronous; returned export ID should be tracked with status endpoints.
- Export and send mode depends on outbound connectivity to target server.

## Related Endpoints

- [Data Migration - Send Export](i-datamigration-sendexport.md)
- [Data Migration - Get Status](o-datamigration-getstatus.md)

## Last Updated

2026-02-17
