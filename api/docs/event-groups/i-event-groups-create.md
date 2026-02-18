---
sidebar_label: "Group Create"
---

# /i/event_groups/create

## Endpoint

```plaintext
/i/event_groups/create
```

## Overview

Create a grouped event definition in `countly.event_groups`.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires `Create` permission on feature `core` for the app provided in `args.app_id`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `args` | JSON String (Object) | Yes | Group definition object. Must be valid JSON. |

### `args` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `app_id` | String | Yes | App ID used for permission validation and document scoping. |
| `name` | String | Yes | Group display name. |
| `source_events` | Array | Yes | Source event keys that belong to the group. |
| `display_map` | Object | Yes | Display metadata object for the group. |
| `status` | Boolean | Yes | Group active state. |
| `description` | String | No | Optional description text. |

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
| `result` | String | Operation status message. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Error: args not found"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Error: could not parse args"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Error: Invalid type for source_events"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

**Status Code**: `401 Unauthorized`
```json
{
  "result": "No app_id provided"
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "error: <db error>"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Standard create | Valid `args` payload and permissions | Validates required fields and types, generates `_id`, inserts group document. | Wrapped string: `{ "result": "Success" }` |

### Impact on Other Data

- This endpoint writes only to event group definitions.  
- It does not update `events.overview` during creation.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level create permissions. |
| `countly.event_groups` | Group definition storage | Inserts new group record with generated `_id`, source events, and metadata. |

## Examples

### Example 1: Create enabled group

```plaintext
/i/event_groups/create?api_key=YOUR_API_KEY&args={"app_id":"6991c75b024cb89cdc04efd2","name":"Playback Group","source_events":["Playback Started","Playback Resumed"],"display_map":{},"status":true}
```

### Example 2: Create disabled group with description

```plaintext
/i/event_groups/create?api_key=YOUR_API_KEY&args={"app_id":"6991c75b024cb89cdc04efd2","name":"Campaign Group","source_events":["Campaign Viewed","Campaign Clicked"],"display_map":{},"status":false,"description":"Campaign funnel events"}
```

## Limitations

- `args` must be valid JSON.
- Group ID generation includes timestamp input, so repeated create calls produce different IDs even with the same payload.

---

## Related Endpoints

- [Event Groups - Group Update](i-event-groups-update.md)
- [Event Groups - Group Delete](i-event-groups-delete.md)

## Last Updated

2026-02-17