---
sidebar_label: "Pipeline"
---

# /o/db - Aggregation Pipeline

## Endpoint

```plaintext
/o/db?db=countly&collection=members&aggregation=[]
```


## Overview

Execute MongoDB aggregation pipeline queries. Supports complex data transformations, grouping, filtering, and analytics. Long-running queries can be saved as reports for future reference.

---

## Authentication
- **Required Permission**: Global admin only (complex queries require elevated access)
- **HTTP Methods**: GET or POST
- **Content-Type**: application/x-www-form-urlencoded or JSON

---


## Permissions

- Required Permission: Global admin only (complex queries require elevated access)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `db` / `dbs` | String | Yes | Database name: `countly`, `countly_drill`, `countly_out`, `countly_fs` |
| `collection` | String | Yes | Collection name |
| `aggregation` | JSON Array String | Yes | Pipeline stages in JSON: `[{"$match": {...}}, {"$group": {...}}]` |
| `save_report` | Boolean | No | Save results as background task report |
| `report_name` | String | No | Custom report name for saved queries |
| `report_desc` | String | No | Report description |
| `period_desc` | String | No | Time period description (for reports) |
| `global` | Boolean | No | Mark report as global (visible to all users) |
| `autoRefresh` | Boolean | No | Auto-refresh report on schedule |
| `manually_create` | Boolean | No | Flag as manually created report |

---

## Response

### Synchronous Response

**Status Code**: `200 OK`

### Success Response

```json
{
  "sEcho": 0,
  "iTotalRecords": 0,
  "iTotalDisplayRecords": 0,
  "aaData": [
    ["Global Admin", 234],
    ["App Manager", 156],
    ["Regular User", 89]
  ],
  "removed": {}
}
```

### Long-Running Query Response

For operations exceeding API threshold:

```json
{
  "task_id": "task_1739365400000_625ef06c0aff525c2e9dc10a"
}
```

**Response Structure**:
- `sEcho` - Echo parameter for DataTables compatibility
- `iTotalRecords` - Total records before filtering
- `iTotalDisplayRecords` - Total records after filtering
- `aaData` - 2D array of results (structure depends on pipeline)
- `removed` - Object with removed aggregation stages (for non-admin restrictions)
- `task_id` - Long-running query task ID (for monitoring)

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

### Pipeline Execution Flow

```javascript
// 1. Parse aggregation JSON array
// 2. Validate all stages are whitelisted
// 3. For non-admins: Remove unsafe stages
// 4. Apply permission filters (if non-admin)
// 5. Check if operation exceeds threshold
// 6. If exceeds threshold: Queue as background task, return task_id
// 7. If quick: Execute directly, return results
// 8. Stream results with EJSON serialization
```

### Whitelisted Aggregation Stages

**Global Admin - All 25+ Stages**:
- $addFields, $bucket, $bucketAuto, $count, $densify, $facet, $fill
- $geoNear, $graphLookup, $group, $limit, $match, $project
- $querySettings, $redact, $replaceRoot, $replaceWith, $sample
- $search, $searchMeta, $set, $setWindowFields, $skip, $sort
- $sortByCount, $unset, $unwind, $vectorSearch

**Non-Admin & Events Data - Removed Stages**:
- $lookup (join to other collections)
- $out (write to collection)
- $merge (merge output)
- Other write operations

### Permission Filtering

```javascript
// Global admin: Full pipeline execution
if (params.member.global_admin) {
  return aggregate(collection, pipeline)
}

// Regular user: Events/drill data only
if (collection === "events_data" || collection === "drill_events") {
  // Remove unsafe stages
  changes = escapeNotAllowedAggregationStages(pipeline)
  // Add permission match at beginning
  pipeline.unshift({"$match": base_filter})
  return aggregate(collection, pipeline, changes)
}

// Other: Reject
return "User does not have right to view this collection"
```

### Long-Running Queries

Queries exceeding `request_threshold` configured in API settings:
- Queued as background task
- Returns `task_id` for monitoring
- Results stored in GridFS
- Viewable in admin panel under "DB Tasks"

---

## Error Handling

| Condition | HTTP Status | Response |
|-----------|------------|----------|
| Invalid JSON | 500 | "Aggregation object is not valid." |
| Non-admin access | 401 | "User does not have right to view this collection" |
| Aggregation error | 500 | MongoDB aggregation error message |

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.


## Database Collections

This endpoint does not read or write database collections.

## Examples

### Example 1: Count by Status

**Request**:
```bash
curl -X POST "https://your-server.com/o/db" \
  -d "api_key=ADMIN_API_KEY" \
  -d "db=countly" \
  -d "collection=members" \
  -d 'aggregation=[{"$group": {"_id": "$status", "count": {"$sum": 1}}}]'
```

**Response**: Count of members grouped by status

### Example 2: Complex Multi-Stage Pipeline

**Request**:
```bash
curl -X POST "https://your-server.com/o/db" \
  -d "api_key=ADMIN_API_KEY" \
  -d "db=countly" \
  -d "collection=members" \
  -d 'aggregation=[
    {"$match": {"global_admin": true}},
    {"$group": {"_id": "$global_admin", "count": {"$sum": 1}, "emails": {"$push": "$email"}}},
    {"$sort": {"count": -1}},
    {"$limit": 10}
  ]'
```

**Response**: Top 10 groups by count with email list

### Example 3: Average Calculation

**Request**:
```bash
curl -X POST "https://your-server.com/o/db" \
  -d "api_key=ADMIN_API_KEY" \
  -d "db=countly_drill" \
  -d "collection=events625ef06c0aff525c2e9dc10a" \
  -d 'aggregation=[
    {"$group": {"_id": "$type", "avgValue": {"$avg": "$value"}, "maxValue": {"$max": "$value"}}}
  ]'
```

**Response**: Average and max values grouped by event type

### Example 4: Save as Report

**Request**:
```bash
curl -X POST "https://your-server.com/o/db" \
  -d "api_key=ADMIN_API_KEY" \
  -d "db=countly" \
  -d "collection=members" \
  -d 'aggregation=[{"$group": {"_id": "$status", "count": {"$sum": 1}}}]' \
  -d "save_report=true" \
  -d "report_name=Member Status Count" \
  -d "report_desc=Monthly member status breakdown" \
  -d "global=true"
```

**Response**: Results saved as report viewable in admin panel

### Example 5: Faceted Analysis

**Request**:
```bash
curl -X POST "https://your-server.com/o/db" \
  -d "api_key=ADMIN_API_KEY" \
  -d "db=countly" \
  -d "collection=members" \
  -d 'aggregation=[
    {"$facet": {
      "byStatus": [{"$group": {"_id": "$status", "count": {"$sum": 1}}}],
      "byRole": [{"$group": {"_id": "$role", "count": {"$sum": 1}}}]
    }}
  ]'
```

**Response**: Faceted results with separate groupings

---

## Aggregation Framework Guide

### Common Patterns

**Count Distinct Values**:
```json
[{"$group": {"_id": "$field", "count": {"$sum": 1}}}]
```

**Sum & Average**:
```json
[{"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "avg": {"$avg": "$amount"}}}]
```

**Sort Top Results**:
```json
[
  {"$group": {"_id": "$type", "count": {"$sum": 1}}},
  {"$sort": {"count": -1}},
  {"$limit": 5}
]
```

**Conditional Logic**:
```json
[{"$project": {"status": {"$cond": [{"$gt": ["$amount", 1000]}, "high", "low"]}}}]
```

### Stage Documentation

- **$match** - Filter documents (like WHERE in SQL)
- **$group** - Group and aggregate (like GROUP BY)
- **$sort** - Sort results
- **$limit** - Limit number of docs
- **$skip** - Skip documents
- **$project** - Select/create fields (like SELECT)
- **$lookup** - Join another collection
- **$unwind** - Expand arrays
- **$facet** - Multiple pipelines simultaneously

---

## Related Endpoints

- [/o/db](o-db.md) - List all databases and collections
- [/o/db?db=&collection=](o-db-collection.md) - Query collection documents
- [/o/db?document=](o-db-document.md) - Get single document
- [/o/db?action=get_indexes](o-db-indexes.md) - List collection indexes
- [/o/db/mongotop](o-db-mongotop.md) - MongoDB operation statistics
- [/o/db/mongostat](o-db-mongostat.md) - MongoDB server statistics

---

## Implementation Notes

- **Complex Queries Only**: Requires global admin for security (non-admin restricted to safe stages)
- **Background Tasks**: Long-running queries automatically queued with task management
- **EJSON Output**: Results serialized preserving MongoDB types
- **Stage Validation**: Unsafe stages removed from non-admin pipelines with warning in `removed` field
- **Permission Projection**: Automatic permission filters added to non-admin pipelines
- **Memory Efficient**: Aggregation operations can stream large result sets
- **Report Storage**: Saved reports stored in GridFS for large result sets

## Last Updated

February 2026
