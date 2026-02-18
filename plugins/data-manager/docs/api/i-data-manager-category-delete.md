---
sidebar_label: "Category Delete"
---

# /i/data-manager/category/delete

## Endpoint

```plaintext
/i/data-manager/category/delete
```

## Overview

Deletes category documents by ID for the selected app.

## Authentication

Countly API supports three authentication methods:

1. **API Key** (parameter): `api_key=YOUR_API_KEY`
2. **Auth Token** (parameter): `auth_token=YOUR_AUTH_TOKEN`
3. **Auth Token** (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Required permission: `data_manager` `Delete`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | Target app ID. |
| `categoryIds` | JSON String (Array) | Yes | JSON-stringified array of category document IDs to delete. |

Example:

```json
["65f0b7d9a1b2c3d4e5f60789", "65f0b7d9a1b2c3d4e5f60790"]
```

## Response

### Success Response

```json
"Success"
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | String | Raw string `Success`. |

### Error Responses

`500 Internal Server Error`

```json
{
  "result": "Error"
}
```

`400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

`401 Unauthorized`

```json
{
  "result": "User does not have right"
}
```

## Behavior/Processing

- Validates delete access for `data_manager`.
- Parses `categoryIds` JSON string.
- Deletes matching category IDs scoped to `app_id`.
- Returns success without waiting on delete result verification.

### Impact on Other Data

- Removes matching category records from `countly.event_categories`.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `dm-category-delete` | Delete request is accepted | `{ ids: [ ... ] }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify delete access. |
| `countly.apps` | App context validation | Reads app record for the requested `app_id` during access validation. |
| `countly.event_categories` | Stores per-app event category definitions | Deletes records for provided IDs scoped by app. |
| `countly.systemlogs` | Stores audit trail for management actions | Receives audit entry dispatched for category delete. |

## Examples

### Delete two categories

```plaintext
/i/data-manager/category/delete?api_key=YOUR_API_KEY&app_id=YOUR_APP_ID&categoryIds=["65f0b7d9a1b2c3d4e5f60789","65f0b7d9a1b2c3d4e5f60790"]
```

## Limitations

- Invalid JSON in `categoryIds` fails with generic `Error`.
- Endpoint does not report per-ID delete counts.

## Related Endpoints

- [Data Manager - Categories Read](o-data-manager-category.md)
- [Data Manager - Category Create](i-data-manager-category-create.md)
- [Data Manager - Category Edit](i-data-manager-category-edit.md)

## Last Updated

2026-02-17
