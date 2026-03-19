---
sidebar_label: "Database Check"
---

# System Utility - Database Check

## Endpoint

```plaintext
/o/system/dbcheck
```

## Overview

Checks MongoDB connectivity by reading a known document from `plugins` collection.

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
  "result": true
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Boolean | `true` when database connectivity probe succeeds; `false` otherwise. |

### Error Responses

```json
{
  "result": false
}
```

## Behavior/Processing

- Reads `countly.plugins` with `{_id:"plugins"}`.
- Returns boolean DB connectivity result via wrapped `result`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.plugins` | Connectivity probe | Reads one document for DB reachability check. |

## Examples

```plaintext
/o/system/dbcheck?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
