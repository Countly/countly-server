---
sidebar_label: "Event Delete"
---

# /i/events/delete_events

## Endpoint

```plaintext
/i/events/delete_events
```

## Overview

Permanently delete one or more events and remove associated event metadata references.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Delete permission for feature `events` on the target app is required.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | Target app ID. |
| `events` | JSON String (Array) | Yes | Event key list to delete. |

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
| `result` | String | Deletion status string. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing events to delete"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Could not find event"
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": {
    "errorMessage": "Event deletion failed. Failed to delete some data related to this Event."
  }
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Multi/single event delete | Valid non-empty events list | Drops per-event aggregate collections, updates event metadata lists/maps, triggers integration cleanup for each event. | Wrapped string `{ "result": "Success" }` |
| Empty delete list | `events` missing/invalid/empty after parsing | Rejects request before deletion. | Wrapped string `{ "result": "Missing events to delete" }` |
| Integration partial failure | Some integration cleanup calls reject | Logs failures but request can still complete with success after core metadata updates. | Wrapped string `{ "result": "Success" }` |

### Impact on Other Data

- Drops per-event aggregate collections named `events{sha1(eventKey+appId)}` for deleted events.
- Removes deleted event keys from `countly.events` metadata fields (`list`, `order`, `overview`, `map`, `segments`, `omitted_segments`).
- Triggers event-delete integration hooks so additional feature data can be cleaned.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `event_deleted` | After successful core deletion update path | `{ events, appID }` with deleted event key list. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level delete permissions. |
| `countly.events` | Event metadata update target | Reads event metadata and removes references to deleted event keys. |
| `countly.events{sha1(eventKey+appId)}` | Per-event aggregate storage | Drops event aggregate collections for each deleted event key. |

---
## Examples

### Example 1: Delete two events

```plaintext
/i/events/delete_events?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&events=["Legacy Event","Internal Debug Event"]
```

## Operational Considerations

- Event deletion is destructive and cannot be reversed through this endpoint.
- Deleting many events can be expensive because each event collection is dropped and metadata is rewritten.
- Integration cleanup failures may be logged without changing success response shape in some branches.

## Limitations

- Event keys must be provided as a JSON array string.

---
## Related Endpoints

- [Events - Event Mapping Update](i-events-edit-map.md)
- [Events - Event Visibility Update](i-events-change-visibility.md)

## Last Updated

2026-02-17