---
sidebar_label: "Inspector Stop"
---

# System Utility - Stop Inspector

## Endpoint

```plaintext
/i/inspector/stop
```

## Overview

Stops inspector mode.

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
  "result": "Stoping inspector for all processes"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Success message when inspector is stopped. |

### Error Responses

```json
{
  "result": "Error: Inspector needs to be started"
}
```

## Behavior/Processing

- Stops inspector and clears running timeout state.

## Database Collections

This endpoint does not read or write database collections.

## Examples

```plaintext
/i/inspector/stop?api_key=YOUR_API_KEY
```

## Last Updated

2026-03-07
