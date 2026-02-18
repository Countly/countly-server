---
sidebar_label: "Category Edit"
---

# /i/data-manager/category/edit

## Endpoint

```plaintext
/i/data-manager/category/edit
```

## Overview

Bulk updates category names and upserts missing category IDs for the selected app.

## Authentication

Countly API supports three authentication methods:

1. **API Key** (parameter): `api_key=YOUR_API_KEY`
2. **Auth Token** (parameter): `auth_token=YOUR_AUTH_TOKEN`
3. **Auth Token** (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Required permission: `data_manager` `Update`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | Target app ID. |
| `categories` | JSON String (Array) | Yes | JSON-stringified array of category objects. |

### `categories` Array Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | String | No | Existing category ID. If omitted, a new ObjectID is generated and upsert path creates a new category document. |
| `name` | String | Yes | Category name to store. |

Example:

```json
[
  {"_id": "65f0b7d9a1b2c3d4e5f60789", "name": "Revenue"},
  {"name": "Retention"}
]
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

- Validates update access for `data_manager`.
- Parses `categories` JSON string.
- Builds `bulkWrite` `updateOne` operations per entry.
- Uses `upsert: true` so missing IDs create new category records.

### Impact on Other Data

- Updates or inserts category records in `countly.event_categories`.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `dm-category-edit` | Bulk write request is accepted | `{ categories: [ ... ] }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify update access. |
| `countly.apps` | App context validation | Reads app record for the requested `app_id` during access validation. |
| `countly.event_categories` | Stores per-app event category definitions | Bulk updates existing docs and upserts missing IDs. |
| `countly.systemlogs` | Stores audit trail for management actions | Receives audit entry dispatched for category edit. |

## Examples

### Update and upsert categories in one request

```plaintext
/i/data-manager/category/edit?api_key=YOUR_API_KEY&app_id=YOUR_APP_ID&categories=[{"_id":"65f0b7d9a1b2c3d4e5f60789","name":"Revenue"},{"name":"Retention"}]
```

## Limitations

- Invalid JSON in `categories` fails the request with generic `Error`.
- Upsert behavior creates new documents when `_id` is missing.

## Related Endpoints

- [Data Manager - Categories Read](o-data-manager-category.md)
- [Data Manager - Category Create](i-data-manager-category-create.md)
- [Data Manager - Category Delete](i-data-manager-category-delete.md)

## Last Updated

2026-02-17
