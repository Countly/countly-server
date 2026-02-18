---
sidebar_label: "Health Check"
---

# /o/system/healthcheck

## Overview

Comprehensive system health status check. Returns aggregated health metrics for all critical system components including CPU, memory, disk, and database connectivity. Used for monitoring dashboards and alerting systems.

---

## Endpoint


```plaintext
/o/system/healthcheck
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
  "status": "healthy",
  "timestamp": "2024-02-13T10:30:00Z",
  "components": {
    "memory": {
      "status": "healthy",
      "usage": "72.9%",
      "threshold": "85%"
    },
    "cpu": {
      "status": "healthy",
      "usage": "45.2%",
      "threshold": "80%"
    },
    "disk": {
      "status": "healthy",
      "usage": "70%",
      "threshold": "90%"
    },
    "database": {
      "status": "connected",
      "latency_ms": 2.5
    }
  }
}
```

#### Error Response
**Status Code**: `500 Internal Server Error`

**Body**:
```json
{"result": "System check failed"}
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

### Example 1: Check system health

**Description**: Get overall system health status

**Request** (GET):
```bash
curl "https://your-server.com/o/system/healthcheck?api_key=YOUR_GLOBAL_ADMIN_KEY"
```

**Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2024-02-13T10:30:00Z",
  "components": {
    "memory": {
      "status": "healthy",
      "usage": "72.9%",
      "threshold": "85%",
      "available_mb": 4200
    },
    "cpu": {
      "status": "healthy",
      "usage": "45.2%",
      "threshold": "80%",
      "cores": 8
    },
    "disk": {
      "status": "healthy",
      "usage": "70%",
      "threshold": "90%",
      "available_gb": 150
    },
    "database": {
      "status": "connected",
      "latency_ms": 2.5,
      "collections": 45
    }
  }
}
```

### Example 2: Check during high load

**Description**: Health check when under heavy load

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o/system/healthcheck" \
  -d "api_key=YOUR_GLOBAL_ADMIN_KEY"
```

**Response** (200):
```json
{
  "status": "warning",
  "timestamp": "2024-02-13T12:15:00Z",
  "components": {
    "memory": {
      "status": "warning",
      "usage": "82.1%",
      "threshold": "85%",
      "available_mb": 1800
    },
    "cpu": {
      "status": "healthy",
      "usage": "74.5%",
      "threshold": "80%",
      "cores": 8
    },
    "disk": {
      "status": "healthy",
      "usage": "75%",
      "threshold": "90%",
      "available_gb": 125
    },
    "database": {
      "status": "connected",
      "latency_ms": 5.2,
      "collections": 45
    }
  }
}
```

### Example 3: Monitor dashboard integration

**Description**: Automated health check for monitoring

**Request** (GET):
```bash
curl "https://your-server.com/o/system/healthcheck?api_key=YOUR_GLOBAL_ADMIN_KEY"
```

**Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2024-02-13T14:00:00Z",
  "components": {
    "memory": {
      "status": "healthy",
      "usage": "68.5%",
      "threshold": "85%"
    },
    "cpu": {
      "status": "healthy",
      "usage": "38.9%",
      "threshold": "80%"
    },
    "disk": {
      "status": "healthy",
      "usage": "62%",
      "threshold": "90%"
    },
    "database": {
      "status": "connected",
      "latency_ms": 1.8
    }
  }
}
```

---

## Behavior/Processing

### Health Check Flow

1. **Validate** global admin permission
2. **Collect** memory statistics
3. **Collect** CPU statistics
4. **Collect** disk statistics
5. **Test** database connectivity
6. **Evaluate** against thresholds
7. **Determine** overall status
8. **Return** comprehensive health data

### Status Levels

**healthy**:
- All components within normal thresholds
- Database responsive
- No warnings

**warning**:
- One or more components approaching threshold
- Still functional but attention recommended
- May escalate if not addressed

**critical**:
- One or more components exceeded threshold
- Service may be impacted
- Immediate action recommended

### Thresholds

**Default thresholds**:
- Memory: 85% (warning), 95% (critical)
- CPU: 80% (warning), 95% (critical)
- Disk: 90% (warning), 98% (critical)
- Database: Latency >50ms (warning), >100ms (critical)

---

## Technical Notes

### Component Checks

**Memory Check**:
- Queries system memory
- Compares usage to threshold
- Returns available memory

**CPU Check**:
- Gets average CPU usage
- Returns per-core usage
- Includes core count

**Disk Check**:
- Checks all mounted filesystems
- Returns worst-case usage
- Includes available space

**Database Check**:
- Attempts connection to database
- Measures query latency
- Verifies collection count

### Timing

**Total execution time**: 100-500ms

**Per-component time**:
- Memory: 10-20ms
- CPU: 10-20ms
- Disk: 20-50ms
- Database: 50-200ms

---

## Related Endpoints

- [Get Memory Stats](./o-system-memory.md) - Detailed memory info
- [Get CPU Stats](./o-system-cpu.md) - Detailed CPU info
- [Get Disk Stats](./o-system-disks.md) - Detailed disk info
- [Database Check](./o-system-dbcheck.md) - Detailed DB check

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | Health status |
| `200` | Components degraded | Status: "warning" |
| `500` | Permission denied | Error message |
| `500` | System check failed | Error message |

---

## Implementation Notes

1. **Admin-only**: Requires global admin API key
2. **Real-time data**: No caching, always fresh
3. **Comprehensive**: Tests all major components
4. **Threshold-based**: Status based on configurable limits
5. **Database aware**: Includes connectivity check
6. **Fast response**: Completes in `<500ms`
7. **Persistent format**: Consistent response structure
8. **Aggregated status**: Overall status computed
9. **Per-component detail**: Detailed breakdown included
10. **Monitoring-friendly**: Suitable for dashboards
11. **Alert-ready**: Clear status levels for alerting
12. **Performance impact**: Minimal resource usage

## Last Updated

February 2026
