---
sidebar_label: "Disk Stats"
---

# System Utility - Disk Stats

## Endpoint

```plaintext
/o/system/disks
```

## Overview

Returns filesystem usage from `df -x tmpfs -x devtmpfs`.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires Global Admin access.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Response

### Success Response

```json
{
  "result": {
    "overall": {
      "usage": 70.0
    },
    "details": [
      {
        "id": "/dev/sda1",
        "usage": 70.0,
        "total": 536870912000,
        "used": 375809638400,
        "free": 161061273600,
        "units": "Byte"
      }
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Object | Disk usage payload. |
| `result.overall.usage` | Number | Aggregated disk usage percentage. |
| `result.details[]` | Array | Per-filesystem usage rows. |
| `result.details[].id` | String | Filesystem identifier (for example `/dev/sda1`). |
| `result.details[].total/used/free` | Number | Size values in bytes. |

### Error Responses

```json
{
  "result": "...error message..."
}
```

## Behavior/Processing

- Excludes tmpfs/devtmpfs and some loop/boot entries.
- Aggregates overall disk usage and returns per-filesystem details.

## Database Collections

This endpoint does not read or write database collections.

## Examples

```plaintext
/o/system/disks?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
