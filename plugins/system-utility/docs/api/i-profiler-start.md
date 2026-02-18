---
sidebar_label: "Start Profiler"
---

# /i/profiler/start

## Overview

Start CPU and memory profiling for all Node.js processes. Captures performance metrics for analysis and auto-stops after 2 hours for safety. Returns a confirmation message.

---

## Endpoint


```plaintext
/i/profiler/start
```

## Authentication

- **Required**: Global admin permission (required)
- **HTTP Method**: GET or POST
- **Permission**: Global Admin only

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | Global admin API key |

## Response

#### Success Response
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{"result": "Starting profiler for all processes"}
```

#### Error Response
**Status Code**: `500 Internal Server Error`

**Body**:
```json
{"result": "Already started"}
```

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

## Permissions

- Required: Global admin permission (required)


## Database Collections

This endpoint does not read or write database collections.

## Examples

### Example 1: Start profiler

**Description**: Begin CPU and memory profiling

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/profiler/start" \
  -d "api_key=YOUR_GLOBAL_ADMIN_KEY"
```

**Response** (200):
```json
{"result": "Starting profiler for all processes"}
```

### Example 2: Verify profiler started

**Description**: Start call with GET method

**Request** (GET):
```bash
curl "https://your-server.com/i/profiler/start?api_key=YOUR_GLOBAL_ADMIN_KEY"
```

**Response** (200):
```json
{"result": "Starting profiler for all processes"}
```

### Example 3: Error when already running

**Description**: Profiler already active

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/profiler/start" \
  -d "api_key=YOUR_GLOBAL_ADMIN_KEY"
```

**Response** (500):
```json
{"result": "Already started"}
```

---

## Behavior/Processing

### Profiler Start Flow

1. **Validate** global admin permission
2. **Check** if profiler already running
3. **Initialize** profiler for master process
4. **Start** V8 profiler
5. **Set** 2-hour timeout
6. **Send** IPC messages to worker processes
7. **Return** confirmation message

### Timeout Mechanism

**Auto-stop after**: 2 hours (7,200 seconds)

**Reason**: Safety mechanism to prevent disk space issues

**Manual stop**: Use `/i/profiler/stop` endpoint

### IPC Communication

**Command sent**:
```javascript
{cmd: "startProfiler", args: [processName]}
```

**Propagation**: Sent to all worker processes

---

## Technical Notes

### V8 Profiler

**Type**: CPU profiler with memory sampling

**Output format**: V8 internal format

**Features**:
- Function-level CPU usage
- Memory allocation tracking
- Call tree analysis

### File Storage

**Location**: Feature temporary directory

**Format**: `.cpuprofile` files

**Cleanup**: Manual via `/i/profiler/list-files` endpoint

### Performance Impact

**Overhead**: 5-10% CPU increase

**Memory**: ~50MB for profiler data

**Recommendation**: Use during test or low-traffic periods

---

## Related Endpoints

- [Stop Profiler](./i-profiler-stop.md) - End profiling
- [Take Heap Snapshot](./i-profiler-take-heap-snapshot.md) - Memory snapshot
- [List Profiler Files](./i-profiler-list-files.md) - View results
- [Download Profiler Data](./i-profiler-download-all.md) - Export results

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | "Starting profiler" |
| `500` | Already started | "Already started" |
| `500` | Permission denied | "Permission denied" |

---

## Implementation Notes

1. **Admin-only**: Requires global admin API key
2. **Limited to one**: Only one profiler session active
3. **Auto-stop after 2 hours**: Safety timeout
4. **IPC-based**: Coordinates with worker processes
5. **V8 profiler**: Native Node.js profiling
6. **Files generated**: Stored in feature directory
7. **Performance impact**: Measurable but acceptable
8. **Must stop explicitly**: Use stop endpoint
9. **Data retention**: Manual cleanup required
10. **Worker propagation**: All processes profiled
11. **Safe to call**: Error if already running
12. **Production caution**: Use carefully on live systems

## Last Updated

February 2026
