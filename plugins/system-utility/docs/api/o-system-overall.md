---
sidebar_label: "Overall Stats"
---

# System Utility - Overall Stats

## Endpoint

```plaintext
/o/system/overall
```

## Overview

Returns combined system summary: host id, platform, cpu, memory, disks, and database stats.

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
    "id": "SYSTEM-ID",
    "platform": "linux",
    "cpu": {"overall": {"usage": 45.2}, "details": []},
    "memory": {"overall": {"usage": 72.9}, "details": []},
    "disks": {"overall": {"usage": 70.0}, "details": []},
    "database": {"overall": {"usage": 75.0}, "details": []}
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Object | Consolidated system snapshot. |
| `result.id` | String | Host identifier. |
| `result.platform` | String | Host platform (`linux`, `darwin`, etc.). |
| `result.cpu/memory/disks/database` | Object | Nested payloads from individual system utility collectors. |

### Error Responses

```json
{
  "result": "...error message..."
}
```

## Behavior/Processing

- Aggregates `id`, `cpu`, `memory`, `disks`, `database` via parallel async calls.

## Database Collections

This endpoint does not read or write database collections.

## Examples

```plaintext
/o/system/overall?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
