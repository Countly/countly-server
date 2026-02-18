---
sidebar_label: "Version Diagnostics"
---

# Countly Diagnostics - Version Read

## Endpoint

```plaintext
/o/countly_version
```

## Overview

Returns Countly package version, filesystem migration markers, database migration markers, and MongoDB server version.

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
  "result": {
    "mongo": "7.0.16",
    "fs": [
      {
        "version": "24.10.0",
        "updated": 1729641600
      }
    ],
    "db": [
      {
        "version": "24.11.0",
        "updated": 1732147200
      }
    ],
    "pkg": "24.11.0"
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result.mongo` | String or Object | MongoDB version string or error object when build info fails. |
| `result.fs` | Array or String/Object | Filesystem migration markers or read/parse error value. |
| `result.db` | Array or String/Object | DB migration marker history or read error value. |
| `result.pkg` | String | Countly package version. |

### Error Responses

**Status Code**: `400 Bad Request`

```json
{
  "result": {
    "mongo": "7.0.16",
    "fs": "error",
    "db": "error",
    "pkg": "24.11.0"
  }
}
```

Returned when both filesystem and database marker reads fail.

**Status Code**: `400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Diagnostics with partial/complete data | At least one marker source (`fs` or `db`) succeeds | Wrapped diagnostics object with status `200`. |
| Dual marker-source failure | Both `fs` and `db` marker reads fail | Wrapped diagnostics object with status `400`. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Auth validation | Resolves authenticated user. |
| `countly.plugins` | DB version marker source | Reads `_id: "version"` marker history. |

---

## Examples

### Example 1: Read version diagnostics

```plaintext
/o/countly_version?api_key=YOUR_API_KEY
```

---

## Limitations

- Endpoint returns diagnostics objects, not only a single semantic version value.
- `mongo`, `fs`, or `db` subfields may contain error payloads while HTTP status remains `200` (if not both marker sources fail).

## Related Endpoints

- [Health Check](../ping/o-ping.md)

## Last Updated

2026-02-17
