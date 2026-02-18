---
sidebar_label: "Get Single"
---

# /o/db - Get Single Document

## Endpoint

```plaintext
/o/db?db=countly&collection=members&document=docs_test_id
```


## Overview

Retrieve a specific document from a collection by its `_id`. Returns complete document with sensitive fields redacted (passwords, API keys, auth token IDs).

---

## Authentication
- **Required Permission**: User must have dbviewer access for the app; Global admin has full access
- **HTTP Methods**: GET or POST
- **Content-Type**: application/x-www-form-urlencoded or JSON
- **Restrictions**: Sensitive fields automatically redacted from response

---


## Permissions

- Required Permission: User must have dbviewer access for the app; Global admin has full access

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `db` / `dbs` | String | Yes | Database name: `countly`, `countly_drill`, `countly_out`, `countly_fs`, or `clickhouse_*` |
| `collection` | String | Yes | Collection/table name |
| `document` | String | Yes | Document _id value (24-char MongoDB ObjectId hex string) |

---

## Response

**Status Code**: `200 OK`

Returns single document object:

### Success Response

```json
{
  "_id": "ObjectId(507f1f77bcf86cd799439011)",
  "name": "Test User",
  "email": "user@example.com",
  "global_admin": false,
  "created": "2026-02-12T10:00:00Z",
  "apps": ["625ef06c0aff525c2e9dc123"],
  "status": "active"
}
```

**Notes**:
- `_id` displayed in ObjectId format
- Password and API key fields omitted (redacted)
- Auth token _id values replaced with `***redacted***`
- All MongoDB types properly serialized via EJSON

**Empty Document Response**:
```json
{}
```

If document not found, returns empty object.

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

### Document Retrieval Flow

```javascript
// 1. Parse document parameter
// 2. Convert string _id to ObjectID if valid 24-char hex
// 3. Check user permission for collection
// 4. Find document by ObjectID
// 5. Redact sensitive fields:
//    - members: remove password, api_key
//    - auth_tokens: replace _id with ***redacted***
// 6. Serialize via EJSON (preserves ObjectId, Binary types)
// 7. Return document object
```

### ObjectID Conversion

```javascript
// String _id must be 24-character hexadecimal
if (isObjectId(params.qstring.document)) {
  // "507f1f77bcf86cd799439011" → ObjectID("507f1f77bcf86cd799439011")
  _id = common.db.ObjectID(params.qstring.document)
}
```

### Permission Checking

```javascript
// Global admin: Access all documents
if (params.member.global_admin) {
  return dbGetDocument()
}

// Regular user: Check access
if (userHasAccess(params, collection)) {
  return dbGetDocument()
} else {
  return "User does not have right to view this document"
}
```

### Sensitive Data Redaction

Automatic field removal for security:
- **members**: Removes `password`, `api_key` fields
- **auth_tokens**: Replaces `_id` value with `***redacted***`
- **Other collections**: Returns all fields

---

## Error Handling

| Condition | HTTP Status | Response |
|-----------|------------|----------|
| Missing _id | 400 | Error message |
| Invalid _id format | 400 | Error message |
| Document not found | 200 | `{}` (empty object) |
| Unauthorized | 401 | "User does not have right to view this document" |
| Database error | 500 | Error message |

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.


## Database Collections

This endpoint does not read or write database collections.

## Examples

### Example 1: Get User Document

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=YOUR_API_KEY" \
  -d "db=countly" \
  -d "collection=members" \
  -d "document=507f1f77bcf86cd799439011"
```

**Response**: Complete user document (minus password/api_key)

### Example 2: Get Auth Token Document

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=YOUR_API_KEY" \
  -d "db=countly" \
  -d "collection=auth_tokens" \
  -d "document=507f1f77bcf86cd799439012"
```

**Response**: Token document with _id redacted for security

### Example 3: Global Admin Access

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=ADMIN_API_KEY" \
  -d "db=countly_drill" \
  -d "collection=events625ef06c0aff525c2e9dc123" \
  -d "document=507f1f77bcf86cd799439013"
```

**Response**: Complete event document (all fields)

### Example 4: Document Not Found

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=YOUR_API_KEY" \
  -d "db=countly" \
  -d "collection=members" \
  -d "document=000000000000000000000000"
```

**Response**:
```json
{}
```

---

## Related Endpoints

- [/o/db](o-db.md) - List all databases and collections
- [/o/db?db=&collection=](o-db-collection.md) - Query collection documents
- [/o/db?action=get_indexes](o-db-indexes.md) - List collection indexes
- [/o/db?aggregation=](o-db-aggregation.md) - Aggregation pipeline
- [/o/db/mongotop](o-db-mongotop.md) - MongoDB operation statistics
- [/o/db/mongostat](o-db-mongostat.md) - MongoDB server statistics

---

## Implementation Notes

- **ObjectID Format**: Requires valid 24-character hexadecimal _id
- **Single Result**: Always returns one document (or empty object if not found)
- **Streaming Not Used**: Single document response not streamed
- **EJSON Serialization**: Preserves MongoDB types like ObjectId, Binary, Timestamp
- **Security First**: Passwords and keys automatically hidden
- **Permission Inherited**: Same access rules as collection query endpoint

## Last Updated

February 2026
