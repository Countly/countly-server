---
sidebar_label: "List"
---

# /o/db

## Endpoint

```plaintext
/o/db
```


## Overview

List all databases and their collections. Retrieves MongoDB and ClickHouse databases accessible to the current user, with collection names and display labels. Call with no `db` or `collection` parameters.

---

## Authentication
- **Required Permission**: User must have access to dbviewer feature for their app(s); Global admin sees all databases
- **HTTP Methods**: GET or POST
- **Content-Type**: application/x-www-form-urlencoded or JSON

---


## Permissions

- Required Permission: User must have access to dbviewer feature for their app(s); Global admin sees all databases

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `app_id` | String | No | Limit to specific app (checks permission first) |

---

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `security.api_additional_headers` | Configured value | Validation/processing | Changing this value can alter request validation, processing behavior, or response fields. |
## Response

**Status Code**: `200 OK`

Returns list of all databases with their collections:

### Success Response

```json
[
  {
    "name": "countly",
    "collections": {
      "members (Users)": "members",
      "apps (Applications)": "apps",
      "sessions": "sessions",
      "events": "events",
      "app_crashes625ef06c0aff525c2e9dc10a (Crashes)": "app_crashes625ef06c0aff525c2e9dc10a"
    }
  },
  {
    "name": "countly_drill",
    "collections": {
      "events625ef06c0aff525c2e9dc10a": "events625ef06c0aff525c2e9dc10a",
      "drill_events": "drill_events"
    }
  },
  {
    "name": "countly_out",
    "collections": {
      "output_data": "output_data"
    }
  },
  {
    "name": "clickhouse_countly_drill",
    "collections": {
      "events_data": "events_data",
      "drill_events_data": "drill_events_data"
    }
  }
]
```

**Response Structure**:
- Array of database objects
- Each database contains:
  - `name` - Database name (prefix `clickhouse_` for ClickHouse DBs)
  - `collections` - Object mapping pretty names to actual collection names
    - Pretty names include app/collection labels for readability
    - Values are actual collection names used in queries

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

### Permission-Based Database List

```javascript
// Global admins see all databases and all collections
if (params.member.global_admin) {
  // List all MongoDB databases and all ClickHouse databases
}

// Regular users see only collections from their assigned apps
var userApps = getUserApps(params.member)
// Filter to collections accessible within user's apps
// If app_id specified, verify user has access first
```

### Collection Discovery

1. **MongoDB Collections**: Uses database.listCollections()
   - Filters out system collections
   - Excludes `system.indexes` and `sessions_*` prefixed
   - Parses collection names to extract app IDs
   - Generates pretty display names

2. **ClickHouse Collections**: Uses ClickHouse service (if enabled)
   - Lists all tables in each ClickHouse database
   - Applies same permission filtering as MongoDB
   - Prefixes database name with `clickhouse_`

### Name Formatting

Collection names are transformed for readability:
- App crashes: `app_crashes<hash>` → "Crashes" with app label
- Events: `events<hash>` → "Events" with app label
- Special: `events` (all) → "Events" (all events)
- View data: `app_viewdata<hash>` → "ViewData" with app label

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.


## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_fs.fs.files` | Stores fs.files documents used by this endpoint. | Reads matching documents from this collection to build the response payload. |
## Examples

### Example 1: List All Databases (Global Admin)

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=YOUR_ADMIN_API_KEY"
```

**Response**: Complete database and collection list for all apps

### Example 2: List Databases for Specific App

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=625ef06c0aff525c2e9dc123"
```

**Response**: Only databases and collections for that app

### Example 3: Regular User Database List

**Request**:
```bash
curl "https://your-server.com/o/db" \
  -d "api_key=YOUR_REGULAR_USER_API_KEY"
```

**Response**: Only databases/collections from user's assigned apps

---

## Related Endpoints

- [/o/db?db=&collection=](o-db-collection.md) - Query collection documents
- [/o/db?document=](o-db-document.md) - Get single document
- [/o/db?action=get_indexes](o-db-indexes.md) - List collection indexes
- [/o/db?aggregation=](o-db-aggregation.md) - Aggregation pipeline
- [/o/db/mongotop](o-db-mongotop.md) - MongoDB operation statistics
- [/o/db/mongostat](o-db-mongostat.md) - MongoDB server statistics

---

## Implementation Notes

- **No Database/Collection Required**: Lists all accessible databases when no params provided
- **App-Level Filtering**: Non-admin users automatically see only their app collections
- **Optional App Restriction**: Even admins can filter to specific app with `app_id` param
- **ClickHouse Support**: Displays ClickHouse databases if feature enabled
- **Pretty Names**: Collection names prettified with app/collection type labels for UI display
- **Permission Inheritance**: Uses getUserApps() to determine accessible collections

## Last Updated

February 2026
