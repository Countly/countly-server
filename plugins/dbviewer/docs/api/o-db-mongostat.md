---
sidebar_label: "MongoDB Stat"
---

# /o/db/mongostat

## Endpoint

```plaintext
/o/db/mongostat
```


## Overview

Display MongoDB server performance statistics. Shows metrics like connections, memory usage, page faults, operations per second, and storage bytes. Useful for monitoring database health and diagnosing performance issues. Global admin only.

---

## Authentication
- **Required Permission**: Global admin (`validateGlobalAdmin`)
- **HTTP Methods**: GET or POST
- **Content-Type**: application/x-www-form-urlencoded or JSON

---


## Permissions

- Required Permission: Global admin (validateGlobalAdmin)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |

---

## Response

**Status Code**: `200 OK`

Returns a 2D array with MongoDB server statistics in a tabular format.

### Success Response

```json
[
  ["host", "insert", "query", "update", "delete", "getmore", "command", "dirty", "used", "conn", "time"],
  ["localhost:27017", "10", "45", "8", "2", "0", "120", "2.4M", "456M", "12", "2026-02-12T14:23:45Z"],
  ["localhost:27017", "12", "52", "6", "1", "0", "118", "2.5M", "458M", "13", "2026-02-12T14:23:46Z"]
]
```

**Response Structure**:
- **Header Row**: Column names (host, insert, query, update, delete, getmore, command, dirty, used, conn, time)
- **Data Rows**: Each row represents a moment in time with server metrics:
  - `host` - MongoDB server address
  - `insert` - Insert operations per second
  - `query` - Query operations per second
  - `update` - Update operations per second
  - `delete` - Delete operations per second
  - `getmore` - Getmore operations (cursor operations) per second
  - `command` - Commands executed per second
  - `dirty` - Memory page percent with unsaved changes (dirty)
  - `used` - Memory usage (bytes formatted as human-readable)
  - `conn` - Number of active connections
  - `time` - Timestamp of the sample

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

## Metrics Explained

| Metric | Unit | Description |
|--------|------|-------------|
| `insert` | ops/sec | Number of insert operations per second |
| `query` | ops/sec | Number of query operations per second |
| `update` | ops/sec | Number of update operations per second |
| `delete` | ops/sec | Number of delete operations per second |
| `getmore` | ops/sec | Cursor batch fetch operations per second |
| `command` | ops/sec | Database commands per second |
| `dirty` | % | Percentage of memory pages with uncommitted changes |
| `used` | bytes | Physical memory usage (formatted: 456M, 2.3G) |
| `conn` | count | Number of open client connections |
| `time` | ISO8601 | UTC timestamp of sample |

---

## Processing Details

### Execution Flow

```javascript
// 1. Validates global admin access
// 2. Spawns mongostat system command with database conn params
// 3. Captures mongostat output on stdout
// 4. Parses output into 2D array format
// 5. Handles multi-part timestamp extraction (last 3 columns = "HH:MM:SS")
// 6. Returns formatted statistics table
// 7. Kills mongostat process
```

### Data Collection

The mongostat command:
- Connects to the MongoDB server using database connection parameters
- Samples the MongoDB server at regular intervals (typically 1-second intervals)
- Collects performance metrics for operations, memory, and connections
- Outputs data as space-separated columns
- Preserves multi-word values (like time column)

### Performance Impact

- **Non-blocking**: Spawned as child process
- **Timeout**: mongostat runs briefly and is terminated after output received
- **Database Load**: Minimal - monitoring command only
- **Connection Use**: Single connection for stats collection

---

## Error Handling

| Condition | Response | HTTP Status |
|-----------|----------|-------------|
| Missing API Key | Error message | 400 |
| Not global admin | Unauthorized message | 401 |
| MongoDB connection failure | stderr logged | 500 |
| mongostat command not found | stderr logged | 500 |

**Example Error Response**:
```json
"User does not have permission to access this resource"
```

---

## Database Connection

Uses the connection parameters from the database configuration (`countly` database):
- Host and port extracted from config
- Authentication credentials (if configured) passed to mongostat
- Command format: `mongostat --host=<host> --port=<port> [--auth params]`

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.


## Database Collections

This endpoint does not read or write database collections.

## Examples

### Example 1: Get MongoDB Server Statistics

**Request**:
```bash
curl "https://your-server.com/o/db/mongostat" \
  -d "api_key=YOUR_API_KEY"
```

**Response** (example):
```json
[
  ["host", "insert", "query", "update", "delete", "getmore", "command", "dirty", "used", "conn", "time"],
  ["localhost:27017", "5", "120", "3", "1", "0", "42", "1.2M", "234M", "8", "2026-02-12T14:25:30Z"],
  ["localhost:27017", "6", "118", "2", "2", "1", "40", "1.3M", "235M", "9", "2026-02-12T14:25:31Z"]
]
```

### Example 2: Via POST Method

**Request**:
```bash
curl -X POST "https://your-server.com/o/db/mongostat" \
  -d "api_key=YOUR_API_KEY"
```

**Response**: Same as GET method

---

## Practical Use Cases

### Identify Performance Issues

High `query` / `update` / `delete` values indicate active database load:
```json
["localhost:27017", "2", "500", "100", "50", "10", "200", "3.5M", "512M", "25", "..."]
// Heavy querying (500 ops/sec) and lots of connections (25)
```

### Monitor Memory Pressure

High `dirty` value indicates memory pressure and potential swapping:
```json
["localhost:27017", "0", "10", "0", "0", "0", "5", "45.2%", "1.8G", "5", "..."]
// 45.2% of pages are dirty (needs flushing to disk)
```

### Check Connection Count

Monitor for connection leaks or excessive client connections:
```json
["localhost:27017", "0", "5", "0", "0", "0", "2", "0.5M", "128M", "150", "..."]
// 150 connections - possibly too many (check for leaks)
```

---

## Related Endpoints

- [/o/db](o-db.md) - Query database collections directly
- [/o/db/mongotop](o-db-mongotop.md) - MongoDB collection-level operation monitoring

---

## Implementation Notes

- **Real-Time Snapshots**: Shows database state at the moment mongostat runs
- **Time Column Handling**: Last column combined from multiple segments for proper timestamp
- **Space Normalization**: Column data normalized to pipe-delimited format for consistent parsing
- **Global Admin Only**: Security restriction - only global admins can access server statistics
- **Child Process Management**: Process killed immediately after data collection (not left running)
- **Human-Readable Sizes**: Memory values shown in human-readable format (M for megabytes, G for gigabytes)
- **Operations/Second**: All operation counts are normalized to per-second rates on MB per second

## Last Updated

February 2026
