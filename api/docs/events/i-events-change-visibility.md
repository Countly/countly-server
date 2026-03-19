---
sidebar_label: "Event Visibility Update"
---

# /i/events/change_visibility

## Endpoint

```plaintext
/i/events/change_visibility
```

## Overview

Show or hide events in event metadata without deleting event definitions.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Update permission for feature `events` on the target app is required.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | Target app ID. |
| `events` | JSON String (Array) | Yes | Event key list to update visibility for. |
| `set_visibility` | String | Yes | Visibility mode: `hide` or `show`. Any value other than `hide` is treated as show-mode. |

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
| `result` | String | Visibility update status. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Could not find event"
}
```

**Status Code**: `401 Unauthorized`
```json
{
  "result": "No app_id provided"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Hide mode | `set_visibility=hide` | Sets per-event `map.{eventKey}.is_visible=false` and removes hidden events from overview list. | Wrapped string `{ "result": "Success" }` |
| Show mode | `set_visibility` is not `hide` | Clears hidden state for selected events by removing `is_visible=false` overrides. | Wrapped string `{ "result": "Success" }` |

### Impact on Other Data

- Updates event metadata map and overview in `countly.events`.
- Does not delete event datasets or event aggregate collections.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `events_updated` | After successful metadata update | `{ update, before }` with updated map/overview and previous map snapshot. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level update permissions. |
| `countly.events` | Event metadata update target | Reads and updates `map` and `overview` fields for selected event keys. |

---
## Examples

### Example 1: Hide selected events

```plaintext
/i/events/change_visibility?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&events=["Old Event","Legacy Event"]&set_visibility=hide
```

### Example 2: Show selected events

```plaintext
/i/events/change_visibility?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&events=["Purchase"]&set_visibility=show
```

## Limitations

- Invalid or unparsable `events` payload is treated as empty list, and request can still return success.

---
## Related Endpoints

- [Events - Event Mapping Update](i-events-edit-map.md)
- [Events - Event Delete](i-events-delete.md)

## Last Updated

2026-02-17
