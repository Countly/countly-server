---
sidebar_label: "Database Stats"
---

# System Utility - Database Stats

## Endpoint

```plaintext
/o/system/database
```

## Overview

Returns MongoDB filesystem usage from `dbStats`.

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
      "usage": 75.0
    },
    "details": [
      {
        "id": "db",
        "usage": 75.0,
        "total": 214748364800,
        "used": 161061273600,
        "free": 53687091200,
        "units": "Byte"
      }
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Object | Database-size usage payload. |
| `result.overall.usage` | Number | Used/total percentage based on dbStats and disk total. |
| `result.details[]` | Array | Database usage detail rows. |
| `result.details[].id` | String | Database row identifier (`db`). |
| `result.details[].total/used/free` | Number | Size values in bytes. |

### Error Responses

```json
{
  "result": "...error message..."
}
```

## Behavior/Processing

- Reads MongoDB database statistics and formats them for API output.

## Database Collections

This endpoint does not read or write database collections.

## Examples

```plaintext
/o/system/database?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
