---
sidebar_label: "Events Read"
---

# /o/data-manager/events

## Endpoint

```plaintext
/o/data-manager/events
```

## Overview

Returns app event definitions with segments, event mapping metadata, and latest related audit entry per event.

## Authentication

Countly API supports three authentication methods:

1. **API Key** (parameter): `api_key=YOUR_API_KEY`
2. **Auth Token** (parameter): `auth_token=YOUR_AUTH_TOKEN`
3. **Auth Token** (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Required permission: `data_manager` `Read`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | Target app ID. |

## Response

### Success Response

```json
[
  {
    "key": "Purchase Completed",
    "segments": ["item", "amount"],
    "category": "Revenue",
    "display": "Purchase Completed",
    "audit": {
      "_id": "Purchase Completed",
      "user_id": "65f0b7d9a1b2c3d4e5f60789",
      "ts": 1739701000,
      "event": "Purchase Completed",
      "userName": "John Admin"
    }
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Array | Raw array of event definition objects. |
| `[].key` | String | Event key. |
| `[].segments` | Array | Segment keys configured for the event. |
| `[].category` | String | Event category from event map metadata (if set). |
| `[].display` | String | Optional display name from event map metadata (if set). |
| `[].audit` | Object | Latest matched data-manager audit entry for the event (if available). |
| `[].audit.user_id` | String | User ID that performed the latest audited action. |
| `[].audit.ts` | Number | Unix timestamp of latest audited action. |
| `[].audit.event` | String | Event key in audit record. |
| `[].audit.userName` | String | Resolved member full name for `user_id` when available. |

### Error Responses

`500 Internal Server Error`

```json
{
  "result": "Error"
}
```

`400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

`401 Unauthorized`

```json
{
  "result": "User does not have right"
}
```

## Behavior/Processing

- Validates read access for `data_manager`.
- Loads app event document and excludes internal events (`[CLY]...`).
- Builds output rows by combining event list, segment metadata, and event map metadata.
- Aggregates latest relevant audit logs (`dm-event-edit`, `dm-event-create`, `dm-event-approve`) per event.
- Resolves audit `user_id` to member full name when possible.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication, permission validation, and audit-user enrichment | Reads member record by auth credentials and resolves `audit.user_id` to `userName`. |
| `countly.apps` | App context validation | Reads app record for the requested `app_id` during access validation. |
| `countly.events` | Stores event lists, segments, and event-level map metadata per app | Reads app event document and builds base event payload. |
| `countly.systemlogs` | Stores audit logs for administrative actions | Reads latest data-manager event audit records for returned events. |

## Examples

### Read app events with audit metadata

```plaintext
/o/data-manager/events?api_key=YOUR_API_KEY&app_id=YOUR_APP_ID
```

## Limitations

- Internal events prefixed with `[CLY]` are not included.
- If member lookup for audit user fails, `userName` can be missing.

## Related Endpoints

- [Data Manager - Categories Read](o-data-manager-category.md)
- [Data Manager - Event Category Update](i-data-manager-event-change-category.md)

## Last Updated

2026-02-17
