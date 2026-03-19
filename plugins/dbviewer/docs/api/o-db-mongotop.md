---
sidebar_label: "MongoDB Top"
---

# DB Viewer - MongoDB Top

## Endpoint

```plaintext
/o/db/mongotop
```

## Overview

Returns live MongoDB namespace activity sampled from the `mongotop` command.

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
[
  ["ns", "total", "read", "write"],
  ["countly.members", "1ms", "1ms", "0ms"],
  ["countly.sessions", "12ms", "7ms", "5ms"]
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array of Arrays | Tabular output from `mongotop` after whitespace normalization. |
| `[][0]` | String | Namespace (`database.collection`) in data rows; header label in first row. |
| `[][1]` | String | Total operation time for namespace. |
| `[][2]` | String | Read operation time for namespace. |
| `[][3]` | String | Write operation time for namespace. |

### Error Responses

Standard authentication/authorization errors from global-admin validation can be returned.

## Behavior/Processing

- Spawns `mongotop` using Countly MongoDB connection parameters.
- Converts command stdout into 2D array rows.
- Removes trailing empty row and returns raw array payload (raw response body).
- Terminates child process after first stdout chunk is parsed.

## Database Collections

This endpoint does not read or write database collections directly.

## Examples

### Read MongoDB namespace activity

```plaintext
/o/db/mongotop?api_key=YOUR_API_KEY
```

## Limitations

- Requires `mongotop` binary in server environment.
- If command fails on stderr, endpoint logs warning server-side and may return no data.

## Related Endpoints

- [DB Viewer - MongoDB Stat](o-db-mongostat.md)
- [DB Viewer - Collections Read](o-db.md)

## Last Updated

2026-03-07
