---
sidebar_label: "Query Documents"
---

# /o/db - Query Collection

## Endpoint

```plaintext
/o/db?db=countly&collection=members
```


## Overview

Query and list documents from a collection with optional filtering, sorting, and pagination. Supports MongoDB and ClickHouse. Results streamed with pagination for large datasets.

---

## Authentication
- **Required Permission**: User must have dbviewer access for the app; Global admin has full access
- **HTTP Methods**: GET or POST
- **Content-Type**: application/x-www-form-urlencoded or JSON
- **Restrictions**: Sensitive fields (password, api_key, auth_tokens._id) automatically redacted

---


## Permissions

- Required Permission: User must have dbviewer access for the app; Global admin has full access

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `db` / `dbs` | String | Yes | Database name: `countly`, `countly_drill`, `countly_out`, `countly_fs`, or `clickhouse_*` |
| `collection` | String | Yes | Collection/table name to query |
| `limit` | Integer | No | Results per page (default: 20) |
| `skip` | Integer | No | Number of documents to skip (default: 0) |
| `filter` / `query` | JSON String | No | MongoDB query filter: `{"status": "active"}` or `{"email": {"$regex": "@example.com"}}` |
| `projection` / `project` | JSON String | No | Field inclusion/exclusion: `{"name": 1, "password": 0}` |
| `sort` | JSON String | No | Sort order: `{"_id": -1, "created": 1}` |
| `sSearch` | String | No | Regex search on `_id` field (shorthand for `_id` regexp) |

---

## Response

**Status Code**: `200 OK`

### Success Response

```json
{
  "limit": 20,
  "start": 1,
  "end": 4,
  "total": 4,
  "pages": 1,
  "curPage": 1,
  "collections": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Test User",
      "email": "user@example.com",
      "created_at": "2026-02-12T10:00:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Another User",
      "email": "another@example.com",
      "created_at": "2026-02-11T15:30:00Z"
    }
  ]
}
```

**Response Structure**:
- `limit` - Records per page
- `start` - First record number (1-indexed)
- `end` - Last record number on this page
- `total` - Total matching documents
- `pages` - Total number of pages
- `curPage` - Current page number
- `collections` - Array of documents (field names depend on collection)

---


### Response Fields

| Field | Type | Description |
|---|---|---|
| `*` | Varies | Fields returned by this endpoint. See Success Response example. |


### Error Responses

```json
{
  "result": "Error"
}
```

## Processing Details

### Query Execution Flow

```javascript
// 1. Parse EJSON filter, projection, sort
// 2. ObjectID conversion: "507f..." string → ObjectID if 24-char hex
// 3. Apply permission filters automatically (non-admins)
// 4. Validate collection name (no '$' allowed)
// 5. Find with projection
// 6. Apply sort, skip, limit
// 7. Stream results with count
// 8. Return EJSON-serialized documents
```

### Permission-Based Filtering

```javascript
// Global admins: Full access
if (params.member.global_admin) {
  return dbGetCollection()
}

// Regular users: Auto-filtered by app assignment
if (userHasAccess(params, collection)) {
  base_filter = getBaseAppFilter(params.member, db, collection)
  // Merged into query with $and
  return dbGetCollection()
}
```

### Sensitive Data Redaction

Fields automatically removed for security:
- **members** collection: Removes `password`, `api_key`
- **auth_tokens** collection: Redacts `_id` value

### Streaming & Performance

- Large result sets streamed to prevent memory overflow
- Pagination metadata sent before document stream
- EJSON format preserves MongoDB types (ObjectId, Binary, Timestamp)
- Supports MongoDB and ClickHouse via database abstraction layer

---

## Error Handling

| Condition | HTTP Status | Response |
|-----------|------------|----------|
| Missing `db` or `collection` | 400 | Error message |
| Invalid JSON in filter | 400 | "Failed to parse query. SyntaxError: ..." |
| Collection contains '$' | 400 | "Invalid collection name: Collection names can not contain '$'..." |
| Database not found | 404 | "Database not found." |
| Unauthorized | 401 | "User does not have right to view this collection" |

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.


## Database Collections

This endpoint does not read or write database collections.

## Examples

### Example 1: Simple Collection Query

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=YOUR_API_KEY" \
  -d "db=countly" \
  -d "collection=members" \
  -d "limit=10"
```

**Response**: First 10 members with pagination info

### Example 2: Filter with Projection

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=YOUR_API_KEY" \
  -d "db=countly" \
  -d "collection=members" \
  -d 'query={"global_admin": true}' \
  -d 'projection={"email": 1, "full_name": 1}' \
  -d "limit=20"
```

**Response**: Global admins with only email and full_name fields

### Example 3: Sort and Pagination

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=YOUR_API_KEY" \
  -d "db=countly" \
  -d "collection=members" \
  -d 'sort={"created": -1}' \
  -d "skip=20" \
  -d "limit=10"
```

**Response**: Records 21-30 sorted by newest first

### Example 4: Regex Search on _id

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=YOUR_API_KEY" \
  -d "db=countly" \
  -d "collection=members" \
  -d "sSearch=admin" \
  -d "limit=5"
```

**Response**: Up to 5 members with _id matching 'admin' pattern

### Example 5: Complex Filter Query

**Request**:
```bash
curl -X POST "https://your-server.com/o/db" \
  -d "api_key=YOUR_API_KEY" \
  -d "db=countly" \
  -d "collection=members" \
  -d 'query={"$or": [{"global_admin": true}, {"email": {"$regex": "@company"}}]}' \
  -d "limit=50"
```

**Response**: Members who are global admins OR have company email

---

## MongoDB Query Operators

Supported operators in `filter` parameter:
- Comparison: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`
- Logical: `$and`, `$or`, `$nor`, `$not`
- Element: `$exists`, `$type`
- Evaluation: `$regex`, `$text`, `$where`
- Array: `$all`, `$elemMatch`, `$size`
- Geospatial: `$geoWithin`, `$geoIntersects`, `$near`

---

## Related Endpoints

- [/o/db](o-db.md) - List all databases and collections
- [/o/db?document=](o-db-document.md) - Get single document by _id
- [/o/db?action=get_indexes](o-db-indexes.md) - List collection indexes
- [/o/db?aggregation=](o-db-aggregation.md) - Aggregation pipeline
- [/o/db/mongotop](o-db-mongotop.md) - MongoDB operation statistics
- [/o/db/mongostat](o-db-mongostat.md) - MongoDB server statistics

---

## Implementation Notes

- **Streaming**: Results streamed for memory efficiency with large datasets
- **Permission Inheritance**: Non-admin users automatically limited to their app data
- **EJSON Format**: Preserves MongoDB type information through JSON
- **ClickHouse Support**: Works with ClickHouse databases (prefix: `clickhouse_`)
- **Collection Restrictions**: Automatically excludes `system.indexes` and `sessions_*` collections
- **Default Limit**: 20 documents if limit not specified (configurable per instance)

## Last Updated

February 2026
