---
sidebar_label: "Get Memory Stats"
---

# /o/system/memory

## Overview

Retrieve comprehensive system and process memory statistics. Returns system-wide RAM usage, process-specific memory consumption, and detailed breakdown by memory type. Essential for monitoring memory leaks and system capacity.

---

## Endpoint


```plaintext
/o/system/memory
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
{
  "overall": {
    "total": "15.5 GB",
    "free": "4.2 GB",
    "used": "11.3 GB",
    "usage": "72.9%"
  },
  "process": {
    "heap_used": "85 MB",
    "heap_total": "128 MB",
    "external": "2.1 MB",
    "rss": "156 MB"
  },
  "details": [
    {
      "id": "Mem",
      "total": "16384",
      "free": "4096",
      "used": "12288",
      "usage": "75%"
    }
  ]
}
```

#### Error Response
**Status Code**: `500 Internal Server Error`

**Body**:
```json
{"result": "Permission denied"}
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

### Example 1: Get system memory usage

**Description**: Retrieve current memory statistics

**Request** (GET):
```bash
curl "https://your-server.com/o/system/memory?api_key=YOUR_GLOBAL_ADMIN_KEY"
```

**Response** (200):
```json
{
  "overall": {
    "total": "15.5 GB",
    "free": "4.2 GB",
    "used": "11.3 GB",
    "usage": "72.9%"
  },
  "process": {
    "heap_used": "85 MB",
    "heap_total": "128 MB",
    "external": "2.1 MB",
    "rss": "156 MB"
  },
  "details": [
    {
      "id": "Mem",
      "total": "16384",
      "free": "4096",
      "used": "12288",
      "usage": "75%"
    }
  ]
}
```

### Example 2: Monitor memory for potential leak

**Description**: Check memory stats periodically

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o/system/memory" \
  -d "api_key=YOUR_GLOBAL_ADMIN_KEY"
```

**Response** (200):
```json
{
  "overall": {
    "total": "31 GB",
    "free": "8 GB",
    "used": "23 GB",
    "usage": "74.2%"
  },
  "process": {
    "heap_used": "220 MB",
    "heap_total": "256 MB",
    "external": "15 MB",
    "rss": "512 MB"
  },
  "details": [
    {
      "id": "Mem",
      "total": "32768",
      "free": "8192",
      "used": "24576",
      "usage": "75%"
    }
  ]
}
```

### Example 3: Check process heap usage

**Description**: Monitor Node.js process heap specifically

**Request** (GET):
```bash
curl "https://your-server.com/o/system/memory?api_key=YOUR_GLOBAL_ADMIN_KEY"
```

**Response** (200):
```json
{
  "overall": {
    "total": "8 GB",
    "free": "2 GB",
    "used": "6 GB",
    "usage": "75%"
  },
  "process": {
    "heap_used": "45 MB",
    "heap_total": "64 MB",
    "external": "0.8 MB",
    "rss": "95 MB"
  },
  "details": [
    {
      "id": "Mem",
      "total": "8192",
      "free": "2048",
      "used": "6144",
      "usage": "75%"
    }
  ]
}
```

---

## Behavior/Processing

### Memory Retrieval Flow

1. **Validate** global admin permission
2. **Query** system memory via 'free' command
3. **Query** Node.js process memory via process.memoryUsage()
4. **Parse** memory values
5. **Calculate** usage percentages
6. **Format** for output (MB/GB conversion)
7. **Return** comprehensive memory data

### Memory Types

**System Memory**:
- `total` - Total system RAM
- `free` - Available free memory
- `used` - Currently used memory
- `usage` - Percentage used

**Process Memory**:
- `heap_used` - Heap memory currently allocated
- `heap_total` - Total heap capacity
- `external` - Memory from C++ objects
- `rss` - Resident set size (physical memory)

### Calculations

**Usage percentage**:
```
usage = (used / total) * 100
```

**Unit conversion**:
```
KB to MB: divide by 1024
MB to GB: divide by 1024
```

---

## Technical Notes

### Database Operations

**No database queries**: Uses system commands

**System commands used**:
```bash
free -b  # Get system memory (flags vary by OS)
ps aux   # Get process info (memory section)
```

### Node.js Memory Usage

**Method**: `process.memoryUsage()`

**Returns object**:
```javascript
{
  rss: resident_set_size,      // Physical memory
  heapTotal: heap_total,        // Heap capacity
  heapUsed: heap_used,          // Heap in use
  external: external_memory,    // C++ object memory
  arrayBuffers: array_buffers   // Buffer memory
}
```

### Memory Leak Detection

**Indicators**:
- `heap_used` increasing over time without decrease
- `rss` (resident set) continuously growing
- `used` system memory approaching `total`

**Recommended action**:
- Use profiler to identify leaking objects
- Check for circular references
- Review event listeners

---

## Related Endpoints

- [Get CPU Stats](./o-system-cpu.md) - CPU performance metrics
- [Get Overall Stats](./o-system-overall.md) - Combined system stats
- [Health Check](./o-system-healthcheck.md) - System health overview
- [Start Profiler](./i-profiler-start.md) - Profile for detailed analysis

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | Memory statistics |
| `500` | Permission denied | Error message |
| `500` | System command failed | Error message |
| `500` | Process info unavailable | Error message |

---

## Implementation Notes

1. **Admin-only**: Requires global admin API key
2. **Real-time data**: No caching, always fresh
3. **Cross-platform**: Works on Linux/macOS/Windows
4. **Process-specific**: Shows Node.js process memory
5. **System-wide**: Includes all system memory
6. **Percentage calculation**: (used/total)*100
7. **Unit conversion**: Automated KB→MB→GB
8. **High precision**: Returns exact byte counts
9. **Rapid calls**: Safe to call frequently (monitoring)
10. **Memory leak indicator**: heap_used growth pattern
11. **Capacity planning**: Track usage trends
12. **Performance impact**: Minimal (~10ms)

## Last Updated

February 2026
