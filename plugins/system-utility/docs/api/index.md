---
sidebar_position: 1
sidebar_label: "Overview"
---

# System Utility

## Overview

The System Utility feature provides server-side diagnostics and performance monitoring endpoints. Administrators can inspect memory usage, CPU performance, disk space, database health, and run profiling/debugging tools. Essential for monitoring production deployments and troubleshooting performance issues.

---

## Key Features

- **Performance Profiling**: CPU profiling and heap analysis
- **Debugging Tools**: Node.js inspector integration
- **System Metrics**: Real-time memory, CPU, disk, database monitoring
- **Health Monitoring**: Comprehensive health checks and diagnostics
- **Database Analysis**: Database statistics and connection verification
- **Global Admin Only**: All endpoints require global admin permissions

---


## Database Collections

| Collection | Purpose |
|---|---|
| `countly.plugins` | Used only by `/o/system/dbcheck` as a lightweight connectivity probe (`{ _id: "plugins" }`). |
| _No dedicated System Utility feature collections_ | Most endpoints read host/runtime state and do not persist feature-specific data in MongoDB. |


## Configuration & Settings

System utilities use core configuration. See `api/config.js` for settings.

## API Endpoints

### Inspector (Debugging)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| [Start Inspector](./i-inspector-start.md) | POST | Enable Node.js inspector debugging |
| [Stop Inspector](./i-inspector-stop.md) | POST | Disable Node.js inspector |

### Profiler (Performance Analysis)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| [Start Profiler](./i-profiler-start.md) | POST | Start CPU/memory profiling |
| [Stop Profiler](./i-profiler-stop.md) | POST | Stop profiling and save results |
| [Take Heap Snapshot](./i-profiler-take-heap-snapshot.md) | GET | Capture memory heap snapshot |
| [List Profiler Files](./i-profiler-list-files.md) | GET | List available profiler results |
| [Download Profiler Data](./i-profiler-download-all.md) | GET | Download all profiler files |

### System Metrics (Monitoring)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| [Get Memory Stats](./o-system-memory.md) | GET | System and process memory usage |
| [Get Disk Stats](./o-system-disks.md) | GET | Disk space and utilization |
| [Get CPU Stats](./o-system-cpu.md) | GET | CPU usage and performance |
| [Get Database Stats](./o-system-database.md) | GET | Database disk usage |
| [Get Overall Stats](./o-system-overall.md) | GET | Combined system statistics |
| [Health Check](./o-system-healthcheck.md) | GET | System health status |
| [Database Check](./o-system-dbcheck.md) | GET | Database connection status |

---

## Data Structures

### Memory Response

```javascript
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
    "external": "2.1 MB"
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

### Disk Response

```javascript
{
  "overall": {
    "total": "500 GB",
    "free": "150 GB",
    "used": "350 GB",
    "usage": "70%"
  },
  "details": [
    {
      "id": "/",
      "total": "500 GB",
      "free": "150 GB",
      "used": "350 GB",
      "usage": "70%"
    }
  ]
}
```

### CPU Response

```javascript
{
  "overall": {
    "usage": "45.2%",
    "cores": 8
  },
  "cores": [
    {
      "id": "cpu0",
      "usage": "42.1%"
    },
    {
      "id": "cpu1",
      "usage": "48.3%"
    }
  ]
}
```

---

## Authentication
**All endpoints require**:
- API key with global admin permissions
- Cannot be executed by regular users or app-level admins
- Restricted to server administrator role

**Permission structure**:
```javascript
global-admin validation(params, () => {
  // Execute endpoint logic
});
```

---

## Common Use Cases

### 1. Production Monitoring
Monitor server resources in real-time to ensure healthy operation

**Related Endpoints**: 
- [Health Check](./o-system-healthcheck.md)
- [Get Memory Stats](./o-system-memory.md)
- [Get CPU Stats](./o-system-cpu.md)

### 2. Performance Troubleshooting
Identify memory leaks and CPU bottlenecks

**Related Endpoints**:
- [Start Profiler](./i-profiler-start.md)
- [Take Heap Snapshot](./i-profiler-take-heap-snapshot.md)
- [Stop Profiler](./i-profiler-stop.md)

### 3. Remote Debugging
Debug Node.js processes on production servers

**Related Endpoints**:
- [Start Inspector](./i-inspector-start.md)
- [Stop Inspector](./i-inspector-stop.md)

### 4. Capacity Planning
Track disk and resource usage trends

**Related Endpoints**:
- [Get Disk Stats](./o-system-disks.md)
- [Get Database Stats](./o-system-database.md)
- [Get Overall Stats](./o-system-overall.md)

### 5. Health Verification
Verify database connectivity and system health

**Related Endpoints**:
- [Database Check](./o-system-dbcheck.md)
- [Health Check](./o-system-healthcheck.md)

---

## Technical Specifications

### Inspector

**Port**: Configurable via `masterInspectorPort` (default: 9229)

**Runtime**: 2 hours maximum (auto-stop)

**Use Case**: Remote debugging with Chrome DevTools

### Profiler

**Format**: V8 CPU profiler format

**Output**: Heap snapshots and CPU profiles

**Storage**: Temporary files in feature directory

**Use Case**: Performance analysis and memory leak detection

### System Metrics

**Source**: System commands (free, df, ps, etc.)

**Update Frequency**: On-demand

**Caching**: No caching (always fresh)

**accuracy**: System-dependent

---

## Related Documentation



## Last Updated

2026-02-17
