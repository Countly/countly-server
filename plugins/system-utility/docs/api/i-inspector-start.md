---
sidebar_label: "Inspector Start"
---

# System Utility - Start Inspector

## Endpoint

```plaintext
/i/inspector/start
```

## Overview

Starts Node inspector mode (master process) with auto-stop timeout.

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

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.masterInspectorPort` | `9229` | Inspector connection info | Returned `ports` array uses this configured port value. |

## Response

### Success Response

```json
{
  "result": {
    "ports": [9229]
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Object | Inspector startup response payload. |
| `result.ports` | Array of Number | Inspector port list exposed by the running process set. |

### Error Responses

```json
{
  "result": "Error: Already started"
}
```

## Behavior/Processing

- Starts inspector and sets a 2-hour auto-stop timer.
- If already running, returns `500` with error text.

## Database Collections

This endpoint does not read or write database collections.

## Examples

```plaintext
/i/inspector/start?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
