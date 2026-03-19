---
sidebar_label: "Profiler Stop"
---

# System Utility - Stop Profiler

## Endpoint

```plaintext
/i/profiler/stop
```

## Overview

Stops profiler mode and finalizes profile files.

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
  "result": "Stoping profiler for all processes"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Success message when profiler is stopped. |

### Error Responses

```json
{
  "result": "Error: Profiler needs to be started"
}
```

## Behavior/Processing

- Stops profiler and writes profiler artifacts under log profile directory.

## Database Collections

This endpoint does not read or write database collections.

## Examples

```plaintext
/i/profiler/stop?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
