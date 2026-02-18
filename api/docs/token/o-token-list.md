---
sidebar_label: "Token List"
---

# Token - Token List

## Endpoint

```plaintext
/o/token/list
```

## Overview

Returns all tokens owned by the authenticated user.

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

## Response

### Success Response

```json
{
  "result": [
    {
      "_id": "884803f9e9eda51f5dbbb45ba91fa7e2b1dbbf4b",
      "ttl": 3600,
      "ends": 1771238910,
      "multi": false,
      "owner": "67b1d21f1c8b2b714d99e001",
      "app": ["6991c75b024cb89cdc04efd2"],
      "endpoint": ["^/o/apps"],
      "purpose": "Read Apps",
      "temporary": false
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Array | List of tokens owned by authenticated user. |
| `result[]._id` | String | Token ID. |
| `result[].ttl` | Number | Token TTL in seconds (`0` means non-expiring). |
| `result[].ends` | Number | Expiration Unix timestamp (seconds). |
| `result[].multi` | Boolean | Reuse flag. |
| `result[].owner` | String | Token owner ID. |
| `result[].app` | String or Array | App restrictions. |
| `result[].endpoint` | String or Array | Endpoint restrictions. |
| `result[].purpose` | String | Token purpose text. |
| `result[].temporary` | Boolean | Temporary-token flag. |

### Error Responses

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
| Token list mode | Authenticated request | Reads all `auth_tokens` documents where `owner` matches caller ID. | Wrapped token array in `result`. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Auth validation | Resolves authenticated member. |
| `countly.auth_tokens` | Token list source | Reads tokens where `owner` equals caller id. |

---

## Examples

### Example 1: List my tokens

```plaintext
/o/token/list?api_key=YOUR_API_KEY
```

---

## Related Endpoints

- [Token Create](i-token-create.md)
- [Token Delete](i-token-delete.md)
- [Token Check](o-token-check.md)

## Last Updated

2026-02-17
