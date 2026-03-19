---
sidebar_label: "Profiler Start"
---

# System Utility - Start Profiler

## Endpoint

```plaintext
/i/profiler/start
```

## Overview

Starts profiler mode (CPU, heap sampling, precise coverage) with auto-stop timeout.

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
  "result": "Starting profiler for all processes"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Success message when profiler starts. |

### Error Responses

```json
{
  "result": "Error: Already started"
}
```

## Behavior/Processing

- Starts profiler and sets a 2-hour auto-stop timer.
- If profiler is already running, returns `500`.

## Database Collections

This endpoint does not read or write database collections.

## Examples

```plaintext
/i/profiler/start?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
