---
sidebar_label: "Token Delete"
---

# Token - Token Delete

## Endpoint

```plaintext
/i/token/delete
```

## Overview

Deletes one token owned by the authenticated user.

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
| `tokenid` | String | Yes | Token ID to revoke. |

## Response

### Success Response

```json
{
  "result": {
    "n": 1,
    "ok": 1,
    "deletedCount": 1
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Object | Mongo remove result object. |
| `result.deletedCount` | Number | Number of token rows deleted. |

### Error Responses

**Status Code**: `404 Not Found`

```json
{
  "result": "Token id not provided"
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
| Delete success | Valid `tokenid` and ownership match | Removes token by `_id` and `owner`. | Wrapped DB remove result object. |
| Missing token id | `tokenid` omitted | Rejects before DB call. | Wrapped error string. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Auth validation | Resolves authenticated member. |
| `countly.auth_tokens` | Token revocation target | Removes token row matching `_id` and `owner`. |

---

## Examples

### Example 1: Delete token

```plaintext
/i/token/delete?api_key=YOUR_API_KEY&tokenid=884803f9e9eda51f5dbbb45ba91fa7e2b1dbbf4b
```

---

## Limitations

- Endpoint only removes tokens owned by the caller.

## Related Endpoints

- [Token Create](i-token-create.md)
- [Token List](o-token-list.md)

## Last Updated

2026-02-17
