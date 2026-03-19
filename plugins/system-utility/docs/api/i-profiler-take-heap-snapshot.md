---
sidebar_label: "Heap Snapshot"
---

# System Utility - Take Heap Snapshot

## Endpoint

```plaintext
/i/profiler/take-heap-snapshot
```

## Overview

Streams a heap snapshot file as download.

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

Binary stream download with headers:

- `Content-Type: plain/text; charset=utf-8`
- `Content-Disposition: attachment; filename=heap.heapsnapshot`

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(stream body)` | Text stream | Heap snapshot content for the running process. |
| `Content-Type` | Header | `plain/text; charset=utf-8` |
| `Content-Disposition` | Header | `attachment; filename=heap.heapsnapshot` |

### Error Responses

```json
{
  "result": "...error text..."
}
```

## Behavior/Processing

- Writes response headers and streams heap snapshot content.

## Database Collections

This endpoint does not read or write database collections.

## Examples

```plaintext
/i/profiler/take-heap-snapshot?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
