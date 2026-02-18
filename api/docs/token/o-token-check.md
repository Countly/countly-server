---
sidebar_label: "Token Check"
---

# Token - Token Check

## Endpoint

```plaintext
/o/token/check
```

## Overview

Checks whether a token exists and is currently valid.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Any authenticated dashboard user.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `token` | String | Yes | Token value to validate. |

## Response

### Success Response

Valid token:

```json
{
  "result": {
    "valid": true,
    "time": 1800
  }
}
```

Invalid or expired token:

```json
{
  "result": {
    "valid": false,
    "time": 0
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result.valid` | Boolean | Whether the token is valid now. |
| `result.time` | Number | Remaining lifetime in seconds (`0` invalid/expired, `-1` for no-expiry tokens). |

### Error Responses

**Status Code**: `400 Bad Request`

```json
{
  "result": "Missing parameter \"token\""
}
```

**Status Code**: `400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

**Status Code**: `404 Not Found`

```json
{
  "result": "Database error message"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Valid token | Token exists and is not expired | Reads token metadata, computes remaining lifetime in seconds (`-1` for non-expiring). | Wrapped `{ "result": { "valid": true, "time": ... } }` |
| Invalid token | Token missing or expired | Returns invalid status with zero remaining lifetime. | Wrapped `{ "result": { "valid": false, "time": 0 } }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Auth validation | Resolves authenticated member. |
| `countly.auth_tokens` | Token check source | Reads token state and expiry fields. |

---

## Examples

### Example 1: Check token validity

```plaintext
/o/token/check?api_key=YOUR_API_KEY&token=0e1c012f855e7065e779b57a616792fb5bd03834
```

---

## Related Endpoints

- [Token Create](i-token-create.md)
- [Token Delete](i-token-delete.md)
- [Token List](o-token-list.md)

## Last Updated

2026-02-17
