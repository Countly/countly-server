---
sidebar_label: "Health Check"
---

# System Utility - Health Check

## Endpoint

```plaintext
/o/system/healthcheck
```

## Overview

Evaluates rule conditions against `overall` stats and returns pass/fail.

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
| `test` | JSON String (Object) | Yes | Condition map. Example: `{"cpu.overall.usage":{"$lt":90}}` |

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
| `result` | Boolean | `true` when all provided checks pass. |

### Error Responses

```json
{
  "result": false
}
```

or parser/processing error string/object in `result` with `500`.

## Behavior/Processing

- Builds `overall` stats snapshot.
- Parses `test` JSON and evaluates operators (`$lt`, `$lte`, `$gt`, `$gte`, `$eq`) on dotted paths.
- Returns `true` when all conditions pass; otherwise rejects and API returns `500`.

## Database Collections

This endpoint does not read or write database collections directly.

## Examples

```plaintext
/o/system/healthcheck?
  api_key=YOUR_API_KEY&
  test={"cpu.overall.usage":{"$lt":90}}
```

## Last Updated

2026-03-07
