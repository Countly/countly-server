---
sidebar_label: "Health Check"
---

# Ping - Health Check

## Endpoint

```plaintext
/o/ping
```

## Overview

Performs a minimal database-read probe and returns service reachability status.

## Authentication

- No explicit endpoint-level authentication check in handler.

## Permissions

- No explicit endpoint-level permission check in handler.

## Request Parameters

This endpoint has no required query parameters.

## Response

### Success Response

```json
{
  "result": "Success"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | `Success` when DB probe completes without error. |

### Error Responses

**Status Code**: `404 Not Found`

```json
{
  "result": "DB Error"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| DB reachable | Probe query succeeds | Wrapped `Success` string. |
| DB probe failure | Probe query errors | Wrapped `DB Error` string with `404`. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.plugins` | DB liveness probe source | Reads one document (`_id: "plugins"`). |

---

## Examples

### Example 1: Ping API

```plaintext
/o/ping
```

```json
{
  "result": "Success"
}
```

---

## Related Endpoints

- [Version Diagnostics](../countly/o-countly-version.md)

## Last Updated

2026-02-17
