---
sidebar_label: "Config Read"
---

# Data Migration - Get Runtime Config

## Endpoint

```text
/o/datamigration/get_config
```

## Overview

Returns data migration runtime defaults, including export folder path and detected upload size limit from Nginx configuration when available.

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

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| Nginx `client_max_body_size` | Nginx default | Import file-size guidance | Returned `fileSizeLimit` reflects detected max request body size (converted to KB). |

## Response

### Success Response

```json
{
  "result": {
    "def_path": "/path/to/core/plugins/data_migration/export",
    "fileSizeLimit": 102400
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result.def_path` | String | Default export directory path on server. |
| `result.fileSizeLimit` | Number | Detected upload limit in KB, or `0` when not detected. |

### Error Responses

This handler normally returns `200` with fallback values even when Nginx config discovery fails.

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Nginx parsed | `nginx -t` and config parse succeed | Returns default path plus parsed `client_max_body_size` converted to KB. | Wrapped config object |
| Fallback | Nginx parse not available/fails | Returns default path and `fileSizeLimit=0`. | Wrapped config object |

### Impact on Other Data

- Read-only endpoint.

## Database Collections

This endpoint does not read or write database collections directly.

---

## Examples

### Get migration runtime config

```text
/o/datamigration/get_config
```

## Limitations

- If Nginx config parser fails inside callback, handler may not return detailed parse error context.

## Related Endpoints

- [Data Migration - Import](i-datamigration-import.md)

## Last Updated

2026-02-17
