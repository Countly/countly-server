---
sidebar_label: "CPU Stats"
---

# System Utility - CPU Stats

## Endpoint

```plaintext
/o/system/cpu
```

## Overview

Returns CPU usage sampled from `/proc/stat` over a short interval.

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
      "usage": 45.2
    },
    "details": [
      {
        "id": "cpu0",
        "usage": 42.1,
        "total": 12345,
        "free": 6789,
        "used": 5556,
        "units": "Difference"
      }
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Object | CPU usage payload. |
| `result.overall.usage` | Number | Overall CPU usage percentage across sampled interval. |
| `result.details[]` | Array | Per-CPU detail rows. |
| `result.details[].id` | String | CPU identifier (for example `cpu0`). |
| `result.details[].usage` | Number | Usage percentage for the CPU row. |

### Error Responses

```json
{
  "result": "...error message..."
}
```

## Behavior/Processing

- Reads `/proc/stat` twice with ~1s delay and computes usage delta.

## Database Collections

This endpoint does not read or write database collections.

## Examples

```plaintext
/o/system/cpu?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
