---
sidebar_label: "Memory Stats"
---

# System Utility - Memory Stats

## Endpoint

```plaintext
/o/system/memory
```

## Overview

Returns system memory usage derived from `free` command output.

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
      "usage": 72.9
    },
    "details": [
      {
        "id": "mem",
        "usage": 75,
        "total": 17179869184,
        "used": 12884901888,
        "free": 4294967296,
        "units": "Byte"
      }
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Object | Memory usage payload. |
| `result.overall.usage` | Number | Overall memory usage percentage. |
| `result.details[]` | Array | Memory detail rows. |
| `result.details[].id` | String | Memory scope identifier (`mem`, `swap`). |
| `result.details[].total/used/free` | Number | Memory totals in bytes. |

### Error Responses

```json
{
  "result": "...error message..."
}
```

## Behavior/Processing

- Executes `free` on the host and normalizes results into `overall` + `details`.
- Returns a wrapped `result` response.

## Database Collections

This endpoint does not read or write database collections.

## Examples

```plaintext
/o/system/memory?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
