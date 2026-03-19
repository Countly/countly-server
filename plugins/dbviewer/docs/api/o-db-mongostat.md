---
sidebar_label: "MongoDB Stat"
---

# DB Viewer - MongoDB Stat

## Endpoint

```plaintext
/o/db/mongostat
```

## Overview

Returns MongoDB server statistics sampled from the `mongostat` command.

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
  ["host", "insert", "query", "update", "delete", "getmore", "command", "dirty", "used", "conn", "time"],
  ["localhost:27017", "5", "120", "3", "1", "0", "42", "1.2M", "234M", "8", "14:25:30"],
  ["localhost:27017", "6", "118", "2", "2", "1", "40", "1.3M", "235M", "9", "14:25:31"]
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array of Arrays | Tabular output from `mongostat` after whitespace normalization. |
| `[][0]` | String | Host value in data rows; header label in first row. |
| `[][1..9]` | String | Operation/memory/connection metric columns from `mongostat`. |
| `[][10]` | String | Time column (last 3 split tokens recombined by parser when needed). |

### Error Responses

Standard authentication/authorization errors from global-admin validation can be returned.

## Behavior/Processing

- Spawns `mongostat` using Countly MongoDB connection parameters.
- Converts command stdout into 2D array rows.
- Rejoins split time values when parser sees more than expected columns.
- Removes trailing empty row and returns raw array payload (raw response body).
- Terminates child process after first stdout chunk is parsed.

## Database Collections

This endpoint does not read or write database collections directly.

## Examples

### Read MongoDB server stats

```plaintext
/o/db/mongostat?api_key=YOUR_API_KEY
```

## Limitations

- Requires `mongostat` binary in server environment.
- If command fails on stderr, endpoint logs warning server-side and may return no data.

## Related Endpoints

- [DB Viewer - MongoDB Top](o-db-mongotop.md)
- [DB Viewer - Collections Read](o-db.md)

## Last Updated

2026-03-07
