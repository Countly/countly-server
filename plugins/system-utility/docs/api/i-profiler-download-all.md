---
sidebar_label: "Profiler Download"
---

# System Utility - Download All Profiler Files

## Endpoint

```plaintext
/i/profiler/download-all
```

## Overview

Streams all profiler output files as a tar archive.

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
- `Content-Disposition: attachment; filename=profiler.tar`

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(stream body)` | Binary stream | Tar archive containing profiler output files. |
| `Content-Type` | Header | `plain/text; charset=utf-8` |
| `Content-Disposition` | Header | `attachment; filename=profiler.tar` |

### Error Responses

- `404`

```json
{
  "result": "Profiler files couldn't be found"
}
```

- `500`

```json
{
  "result": "...error text..."
}
```

## Behavior/Processing

- Builds tar stream from profiler files directory and pipes it to response.

## Database Collections

This endpoint does not read or write database collections.

## Examples

```plaintext
/i/profiler/download-all?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
