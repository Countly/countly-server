---
sidebar_label: "Collection Query"
---

# DB Viewer - Collection Query

## Endpoint

```plaintext
/o/db?db=countly&collection=members
```

## Overview

Queries documents from a MongoDB collection or ClickHouse table, with filtering, projection, sorting, and pagination.

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
| `db` / `dbs` | String | Yes | Database name (`countly`, `countly_drill`, `countly_out`, `countly_fs`, or `clickhouse_*`). |
| `collection` | String | Yes | Collection/table name. |
| `limit` | Number | No | MongoDB default `20`; ClickHouse default `10`. |
| `skip` | Number | No | MongoDB offset. Default `0`. |
| `filter` / `query` | JSON String | No | Query filter object. |
| `projection` / `project` | JSON String | No | Field projection object. |
| `sort` | JSON String | No | Sort object. |
| `sSearch` | String | No | MongoDB `_id` regex shortcut. |
| `cursor` | String | No | ClickHouse cursor pagination token. |
| `paginationMode` | String | No | ClickHouse pagination mode. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `security.api_additional_headers` | Empty | HTTP response headers | Additional configured headers are appended to streamed MongoDB collection responses. |
| `drill.clickhouse_use_approximate_uniq` | Plugin config | ClickHouse query behavior | Affects ClickHouse uniqueness calculations used by DB Viewer table query path. |

## Response

### Success Response

```json
{
  "limit": 20,
  "start": 1,
  "end": 20,
  "total": 138,
  "pages": 7,
  "curPage": 1,
  "collections": [
    {
      "_id": "ObjectId(507f1f77bcf86cd799439011)",
      "name": "Test User",
      "email": "user@example.com"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `limit` | Number | Page size. |
| `start` | Number | Start row index (1-based in this response contract). |
| `end` | Number | End row index. |
| `total` | Number | Total matching rows. |
| `pages` | Number | Total pages. |
| `curPage` | Number | Current page number. |
| `collections` | Array | Collection/table records. |
| `hasNextPage` | Boolean | ClickHouse cursor mode only. |
| `nextCursor` | String | ClickHouse cursor mode only. |
| `paginationMode` | String | ClickHouse mode reported by backend. |

### Error Responses

- `400`

```json
{
  "result": "Failed to parse query. ..."
}
```

- `400`

```json
{
  "result": "Invalid collection name: Collection names can not contain '$' or other invalid characters"
}
```

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

- `404`

```json
{
  "result": "ClickHouse plugin is disabled."
}
```

## Behavior/Processing

- MongoDB path parses `filter/query`, `projection/project`, and `sort` as EJSON.
- Invalid MongoDB `filter/query` JSON returns `400`; invalid `projection`/`sort` falls back to `{}`.
- For non-admin users, app-level base filters are merged into MongoDB query.
- For `members` collection, `password` and `api_key` are removed.
- For `auth_tokens` collection, `_id` is redacted to `***redacted***`.
- ClickHouse path supports plain object filter or `filter.rows` format and returns the same pagination envelope plus cursor fields.

## Database Collections

This endpoint reads from the collection/table specified by `db` and `collection`.

## Examples

### Query collection (MongoDB)

```plaintext
/o/db?api_key=YOUR_API_KEY&db=countly&collection=members&limit=20&skip=0&sort={"_id":-1}
```

### Query table (ClickHouse)

```plaintext
/o/db?api_key=YOUR_API_KEY&db=clickhouse_countly_drill&collection=events_data&limit=50&filter={"a":"6991c75b024cb89cdc04efd2"}
```

## Related Endpoints

- [DB Viewer - Databases List](o-db.md)
- [DB Viewer - Document Read](o-db-document.md)
- [DB Viewer - Indexes Read](o-db-indexes.md)
- [DB Viewer - Aggregation Query](o-db-aggregation.md)

## Last Updated

2026-03-07
