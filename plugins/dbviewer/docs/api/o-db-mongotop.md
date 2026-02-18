---
sidebar_label: "MongoDB Top"
---

# /o/db/mongotop

## Endpoint

```plaintext
/o/db/mongotop
```


## Overview

Monitor MongoDB operations in real-time. Shows which collections and databases are actively processing read and write operations. Useful for identifying performance hotspots and database activity patterns. Global admin only.

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

Returns a 2D array where each row represents a database/collection combination with operation times.

### Success Response

```json
[
  ["ns", "total", "read", "write"],
  ["countly.app_data", "0ms", "0ms", "0ms"],
  ["countly.members", "1ms", "1ms", "0ms"],
  ["countly_drill.events625ef06c0aff525c2e9dc10a", "15ms", "10ms", "5ms"],
  ["countly.system.namespaces", "0ms", "0ms", "0ms");
]
```

**Response Structure**:
- **Header Row**: ["ns", "total", "read", "write"]
- **Data Rows**: Each row contains:
  - `ns` (namespace): Database and collection name
  - `total` (time): Total operation time
  - `read` (time): Time spent on read operations  
  - `write` (time): Time spent on write operations

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

### Execution Flow

```javascript
// 1. Validates global admin access
// 2. Spawns mongotop system command with database connection params
// 3. Captures mongotop output on stdout
// 4. Parses output into 2D array format
// 5. Normalizes spacing to pipe-delimited format
// 6. Returns formatted data table
// 7. Kills mongotop process
```

### Data Collection

The mongotop command:
- Connects to the MongoDB server using database connection parameters
- Samples the MongoDB server at regular intervals
- Collects operation times for each database/collection pairing
- Outputs data in tabular format
- Data is parsed and formatted for JSON response

### Performance Impact

- **Non-blocking**: Spawned as child process
- **Timeout**: mongotop runs briefly and is terminated after output received
- **Database Load**: Minimal - just monitoring, no queries executed

---

## Error Handling

| Condition | Response | HTTP Status |
|-----------|----------|-------------|
| Missing API Key | Error message | 400 |
| Not global admin | Unauthorized message | 401 |
| MongoDB connection failure | stderr logged | 500 |
| mongotop command not found | stderr logged | 500 |

**Example Error Response**:
```json
"User does not have permission to access this resource"
```

---

## Database Connection

Uses the connection parameters from the database configuration (`countly` database):
- Host and port extracted from config
- Authentication credentials (if configured) passed to mongotop
- Command format: `mongotop --host=<host> --port=<port> [--auth params]`

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.


## Database Collections

This endpoint does not read or write database collections.

## Examples

### Example 1: Get Real-Time MongoDB Operations

**Request**:
```bash
curl "https://your-server.com/o/db/mongotop" \
  -d "api_key=YOUR_API_KEY"
```

**Response** (example):
```json
[
  ["ns", "total", "read", "write"],
  ["admin.$cmd", "0ms", "0ms", "0ms"],
  ["countly.auth_tokens", "12ms", "8ms", "4ms"],
  ["countly.members", "3ms", "3ms", "0ms"],
  ["countly_drill.events625ef06c0aff525c2e9dc10a", "87ms", "60ms", "27ms"],
  ["countly.sessions", "0ms", "0ms", "0ms"]
]
```

### Example 2: Via POST Method

**Request**:
```bash
curl -X POST "https://your-server.com/o/db/mongotop" \
  -d "api_key=YOUR_API_KEY"
```

**Response**: Same as GET method (either HTTP method works identically)

---

## Related Endpoints

- [/o/db](o-db.md) - Query database collections directly
- [/o/db/mongostat](o-db-mongostat.md) - MongoDB server-level statistics

---

## Implementation Notes

- **Real-Time Data**: Shows active operations at the moment mongotop runs
- **Namespace Format**: `<database>.<collection>`
- **Time Units**: Always in milliseconds (ms)
- **Global Admin Only**: Security restriction - only global admins can monitor server operations
- **System Collections**: Includes MongoDB system collections (admin.$cmd, etc.)
- **Child Process**: Spawned with preserved stdout encoding for proper data parsing
- **Early Termination**: Process killed immediately after output received (not left running)

## Last Updated

February 2026
