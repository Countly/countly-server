---
sidebar_label: "Profiler Files"
---

# System Utility - List Profiler Files

## Endpoint

```plaintext
/i/profiler/list-files
```

## Overview

Returns profiler output file list from profile directory.

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
  "result": [
    "master-12345.cpuprofile",
    "master-12345.heapprofile",
    "master-12345.coverage"
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Array of String | Profiler artifact file names currently available for download. |

### Error Responses

```json
{
  "result": "Profiler files couldn't be found"
}
```

## Behavior/Processing

- Returns file list from profiler directory when present.

## Database Collections

This endpoint does not read or write database collections.

## Examples

```plaintext
/i/profiler/list-files?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
