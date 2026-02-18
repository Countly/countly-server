---
sidebar_label: "List Collection"
---

# /o/db - Get Collection Indexes

## Endpoint

```plaintext
/o/db?db=countly&collection=members&action=get_indexes
```


## Overview

Retrieve all indexes defined on a collection. Displays index keys, names, and properties (unique, background, sparse, TTL, etc). Useful for analyzing query performance and database schema.

---

## Authentication
- **Required Permission**: User must have dbviewer access for the app; Global admin has full access
- **HTTP Methods**: GET or POST
- **Content-Type**: application/x-www-form-urlencoded or JSON

---


## Permissions

- Required Permission: User must have dbviewer access for the app; Global admin has full access

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `db` / `dbs` | String | Yes | Database name: `countly`, `countly_drill`, `countly_out`, `countly_fs` |
| `collection` | String | Yes | Collection name |
| `action` | String | Yes | Must be: `get_indexes` |

---

## Response

**Status Code**: `200 OK`

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
    },
    {
      "v": 2,
      "key": {"email": 1},
      "name": "email_1",
      "background": true,
      "unique": true
    },
    {
      "v": 2,
      "key": {"created": 1, "status": 1},
      "name": "created_1_status_1",
      "background": true,
      "expireAfterSeconds": 2592000
    }
  ]
}
```

**Response Structure**:
- `limit` - Indexes per page (display limit)
- `start` - First index number
- `end` - Last index number
- `total` - Total number of indexes
- `pages` - Total pages
- `curPage` - Current page
- `collections` - Array of index objects:
  - `v` - Index version (2 for modern indexes)
  - `key` - Index key specification: `{field: 1, field2: -1}` (1=ascending, -1=descending)
  - `name` - Index name (typically `field_direction` combined)
  - `unique` (optional) - Unique constraint enforced
  - `background` (optional) - Built in background
  - `sparse` (optional) - Sparse index (skip documents missing field)
  - `expireAfterSeconds` (optional) - TTL index (auto-delete after seconds)
  - Other properties as defined in MongoDB

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

### Index Retrieval

```javascript
// 1. Validate user permission for collection
// 2. Get collection object
// 3. Call collection.indexes() callback
// 4. Format indexes array with pagination
// 5. Return index objects with all properties
```

### Permission Checking

```javascript
// Global admin: Access all collection indexes
if (params.member.global_admin) {
  return getIndexes()
}

// Regular user: Check access
if (userHasAccess(params, collection)) {
  return getIndexes()
} else {
  return "User does not have right to view this collection"
}
```

### Index Properties

**Common Index Types**:
- **Standard Index**: `{field: 1}` - Basic field index
- **Compound Index**: `{field1: 1, field2: -1}` - Multiple fields
- **Unique Index**: `{email: 1}` with `unique: true` - Enforces uniqueness
- **TTL Index**: `{created: 1}` with `expireAfterSeconds: 3600` - Auto-delete old docs
- **Sparse Index**: `{field: 1}` with `sparse: true` - Skip null/missing
- **Text Index**: `{content: "text"}` - Full-text search

---

## Error Handling

| Condition | HTTP Status | Response |
|-----------|------------|----------|
| Missing `collection` | 400 | Error message |
| `action` != `get_indexes` | 400 | Error message |
| Unauthorized | 401 | "User does not have right to view this collection" |
| Database error | 500 | Error message |

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.


## Database Collections

This endpoint does not read or write database collections.

## Examples

### Example 1: Get Members Collection Indexes

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=YOUR_API_KEY" \
  -d "db=countly" \
  -d "collection=members" \
  -d "action=get_indexes"
```

**Response**: All indexes on members collection with properties

### Example 2: Get Event Collection Indexes

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=YOUR_API_KEY" \
  -d "db=countly_drill" \
  -d "collection=events625ef06c0aff525c2e9dc10a" \
  -d "action=get_indexes"
```

**Response**: Event collection indexes (typically multiple for different queries)

### Example 3: Admin Access to App Collection Indexes

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=ADMIN_API_KEY" \
  -d "db=countly" \
  -d "collection=apps" \
  -d "action=get_indexes"
```

**Response**: All indexes on apps collection

---

## Index Analysis

### Performance Optimization

Check indexes to identify:
- **Missing Indexes**: Fields frequently queried should have indexes
- **Redundant Indexes**: Remove duplicate or subsumed compound indexes
- **TTL Indexes**: For collections with cleanup requirements
- **Unique Constraints**: Enforce data integrity

### Example Analysis

```json
{
  "v": 2,
  "key": {"email": 1},
  "name": "email_1",
  "unique": true
}
```

This indicates:
- Email field is indexed for fast lookups
- Enforces unique email constraint
- Good for finding by email or preventing duplicates

```json
{
  "v": 2,
  "key": {"created": 1},
  "name": "created_1",
  "expireAfterSeconds": 2592000
}
```

This indicates:
- TTL index on created field
- Documents auto-deleted 30 days after creation (2592000 seconds)
- Useful for cleanup of temporary data

---

## Related Endpoints

- [/o/db](o-db.md) - List all databases and collections
- [/o/db?db=&collection=](o-db-collection.md) - Query collection documents
- [/o/db?document=](o-db-document.md) - Get single document
- [/o/db?aggregation=](o-db-aggregation.md) - Aggregation pipeline
- [/o/db/mongotop](o-db-mongotop.md) - MongoDB operation statistics
- [/o/db/mongostat](o-db-mongostat.md) - MongoDB server statistics

---

## Implementation Notes

- **MongoDB Feature**: Indexes are MongoDB concept (not supported on ClickHouse databases)
- **No Pagination Used**: Usually displays all indexes even with limit/skip pagination wrapper
- **Read-Only**: This endpoint only reads indexes, does not create/modify/delete
- **Performance**: Index lookup is fast operation with minimal server impact
- **Index Version**: All modern indexes use v:2 (v:1 is legacy)

## Last Updated

February 2026
