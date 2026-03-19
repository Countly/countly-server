---
sidebar_label: "Databases List"
---

# DB Viewer - Databases List

## Endpoint

```plaintext
/o/db
```

## Overview

Returns the list of databases and collections/tables available to the current user in DB Viewer.

- Global admins get all available MongoDB databases plus ClickHouse databases (if ClickHouse plugin is enabled).
- Non-admin users get only collections/tables they can access for their assigned apps.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires DB Viewer access (`dbviewer` read right for app-scoped users).

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | No | Restricts output to collections/tables accessible for that app (when user has access). |

## Response

### Success Response

```json
[
  {
    "name": "countly",
    "collections": {
      "members (Users)": "members",
      "apps (Applications)": "apps",
      "sessions": "sessions",
      "events": "events"
    }
  },
  {
    "name": "countly_drill",
    "collections": {
      "drill_events": "drill_events"
    }
  },
  {
    "name": "clickhouse_countly_drill",
    "collections": {
      "events_data": "events_data",
      "drill_events": "drill_events"
    }
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | List of accessible databases. |
| `[].name` | String | Database name. ClickHouse databases are prefixed with `clickhouse_`. |
| `[].collections` | Object | Map of pretty collection/table labels to actual collection/table names. |

### Error Responses

- `404`

```json
{
  "result": "Database not found."
}
```

- `404`

```json
{
  "result": "ClickHouse plugin is disabled."
}
```

Standard authentication and authorization errors from user validation can also be returned.

## Behavior/Processing

- When `db`/`dbs`, `collection`, `document`, `aggregation`, and `action=get_indexes` are all omitted, this endpoint runs in database-list mode.
- MongoDB collections `system.indexes` and `sessions_*` are excluded.
- Collection/table entries are filtered by user access (`dbviewer` rights and app scoping).
- ClickHouse databases/tables are included only if ClickHouse plugin is enabled.
- Collection names are transformed into UI-friendly labels in the `collections` object keys.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.apps` | App lookup for name mapping and app filtering | Reads app IDs and names used to generate readable collection labels and app-scoped filtering. |

## Examples

### List accessible databases

```plaintext
/o/db?api_key=YOUR_API_KEY
```

### List databases scoped to one app

```plaintext
/o/db?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2
```

## Related Endpoints

- [DB Viewer - Collection Read](o-db-collection.md)
- [DB Viewer - Document Read](o-db-document.md)
- [DB Viewer - Indexes Read](o-db-indexes.md)
- [DB Viewer - Aggregation Query](o-db-aggregation.md)

## Last Updated

2026-03-07
