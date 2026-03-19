---
sidebar_label: "Indexes Read"
---

# DB Viewer - Indexes Read

## Endpoint

```plaintext
/o/db?db=countly&collection=members&action=get_indexes
```

## Overview

Returns index definitions for the selected MongoDB collection.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires DB Viewer access (`dbviewer` read right for app-scoped users).

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `db` / `dbs` | String | Yes | MongoDB database name. |
| `collection` | String | Yes | Collection name. |
| `action` | String | Yes | Must be `get_indexes`. |

## Response

### Success Response

```json
{
  "limit": 3,
  "start": 1,
  "end": 3,
  "total": 3,
  "pages": 1,
  "curPage": 1,
  "collections": [
    {
      "v": 2,
      "key": {"_id": 1},
      "name": "_id_"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `limit` | Number | Count of returned index definitions. |
| `start` | Number | Always `1` in this endpoint output. |
| `end` | Number | Last index row number. |
| `total` | Number | Total index count. |
| `pages` | Number | Always `1` for this output shape. |
| `curPage` | Number | Always `1`. |
| `collections` | Array | Index definitions from MongoDB `collection.indexes()`. |

### Error Responses

- `401`

```json
{
  "result": "User does not have right to view this collection"
}
```

- `404`

```json
{
  "result": "Database not found."
}
```

On index-read failure, this handler returns raw string output:

```json
"Somethings went wrong"
```

## Behavior/Processing

- Runs only when `action=get_indexes` with `db` and `collection` provided.
- Uses MongoDB `collection.indexes()` and wraps results in DB Viewer pagination envelope.
- Access is checked per collection for non-admin users.

## Database Collections

This endpoint reads index metadata from the selected MongoDB collection.

## Examples

### Read indexes for a collection

```plaintext
/o/db?api_key=YOUR_API_KEY&db=countly&collection=members&action=get_indexes
```

## Related Endpoints

- [DB Viewer - Collection Query](o-db-collection.md)
- [DB Viewer - Databases List](o-db.md)

## Last Updated

2026-03-07
