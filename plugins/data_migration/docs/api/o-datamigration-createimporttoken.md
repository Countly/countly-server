---
sidebar_label: "Import Token Create"
---

# Data Migration - Create Import Token

## Endpoint

```text
/o/datamigration/createimporttoken
```

## Overview

Creates a scoped auth token that can call `/i/datamigration/import`.

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
| `ttl` | Number | No | Token TTL in minutes. Default becomes 1 day (`86400` seconds) when omitted. |
| `multi` | Boolean | No | Intended multi-use control flag. |
| `args` | JSON String (Object) | No | Optional JSON-stringified helper args. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Response

### Success Response

```json
{
  "result": "ea6bc25d4fc04ed8b8af79f0f8f95d89"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Generated scoped import token. |

### Error Responses

- `404`

```json
{
  "result": "data-migration.unable-to-create-token"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Token created | Authorization storage succeeds | Saves endpoint-scoped token for `/i/datamigration/import`. | Wrapped token string |
| Token create failed | Authorization save fails | Returns failure key. | Wrapped failure key |

### Impact on Other Data

- Creates/updates scoped auth token record for import endpoint access.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.auth_tokens` | Scoped token storage | Inserts token record with owner, TTL, endpoint restrictions, and usage policy. |

---

## Examples

### Create one-day import token

```text
/o/datamigration/createimporttoken?
  ttl=1440
```

## Limitations

- `multi` is only interpreted as `false` when passed as a real boolean false value; string values like `"false"` are treated as multi-use.

## Related Endpoints

- [Data Migration - Import](i-datamigration-import.md)

## Last Updated

2026-02-17
