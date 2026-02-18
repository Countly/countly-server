---
sidebar_label: "Export Send"
---

# Data Migration - Send Existing Export

## Endpoint

```text
/i/datamigration/sendexport
```

## Overview

Sends an already-generated export package to a target Countly server.

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
| `exportid` | String | Yes | Existing export ID to send. |
| `server_token` | String | Yes | Remote import token. |
| `server_address` | String | Yes | Target server base address. |
| `redirect_traffic` | Number/String | No | `1` enables post-import app redirect handoff metadata. |
| `args` | JSON String (Object) | No | Optional JSON-stringified helper args. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

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
| `result` | String | Immediate send-initiation response. |

### Error Responses

- `404`

```json
{
  "result": "data-migration.invalid-exportid"
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
| Send start | Valid parameters | Updates export progress metadata and triggers asynchronous send workflow. | Wrapped `{ "result": "Success" }` |
| Validation failure | Missing export/token/address | Stops before send workflow. | Wrapped error key |

### Impact on Other Data

- Updates export progress/state metadata in `countly.data_migrations`.
- Asynchronous send flow can transition export to finished/failed states.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `export_finished` / `export_failed` | Send/import lifecycle reaches terminal status | `{ app_ids, status, message }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.data_migrations` | Send lifecycle state | Updates send target details and progress before async dispatch. |
| `countly.systemlogs` | Audit trail | Writes terminal export state actions via progress updater. |

---

## Examples

### Send existing export package

```text
/i/datamigration/sendexport?
  exportid=f9b35d90be5f2240eafced7c6bfdf130856cd0a7&
  server_address=http://target-countly.example.com&
  server_token=2fc9d68f6f284f9fa95b93b7d598&
  redirect_traffic=1
```

## Operational Considerations

- This endpoint returns immediately after scheduling send work; use status endpoint to track completion.

## Related Endpoints

- [Data Migration - Export](i-datamigration-export.md)
- [Data Migration - Get Status](o-datamigration-getstatus.md)

## Last Updated

2026-02-17
