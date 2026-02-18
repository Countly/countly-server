---
sidebar_label: "Observability Read"
---

# System - Observability Read

## Endpoint

```plaintext
/o/system/observability
```

## Overview

Collects observability payloads from installed modules and returns them as a list.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires authenticated dashboard user access to management-read endpoints.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |

## Response

### Success Response

```json
[
  {
    "service": "kafka",
    "status": "ok",
    "lag": 0
  },
  {
    "service": "aggregator",
    "status": "ok",
    "secondsBehind": 5
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Array | Array of observability objects returned by installed modules. |
| `service` | String | Example module-level service identifier. Fields vary by module. |
| `status` | String | Example health/state field. Fields vary by module. |

### Error Responses

**Status Code**: `500 Internal Server Error`

```json
{
  "result": "Error collecting observability data"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Successful collection | Observability providers return data successfully | Array of fulfilled observability payloads (can be empty). |
| Collection failure | Dispatch callback returns error | Wrapped error message. |

## Database Collections

This endpoint does not directly read or write database collections.

---

## Examples

### Example 1: Read observability payloads

```plaintext
/o/system/observability?api_key=YOUR_API_KEY
```

```json
[
  {
    "service": "kafka",
    "status": "ok"
  }
]
```

---

## Operational Considerations

- Response schema is module-dependent; treat payload entries as typed-by-service objects.
- A module failure does not guarantee a full endpoint failure unless collection returns a terminal error.

## Limitations

- Returned fields are not fixed across installations.

## Related Endpoints

- [Kafka Status Read](./o-system-kafka.md)
- [Aggregator Status Read](./o-system-aggregator.md)

## Last Updated

2026-02-17
