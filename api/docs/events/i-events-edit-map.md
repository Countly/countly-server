---
sidebar_label: "Event Mapping Update"
---

# /i/events/edit_map

## Endpoint

```plaintext
/i/events/edit_map
```

## Overview

Update event metadata map, event order, overview widgets, and omitted segment rules.

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
| `event_map` | JSON String (Object) | No | Event display metadata map (name/visibility overrides). |
| `event_order` | JSON String (Array) | No | Ordered event key list for UI order. |
| `event_overview` | JSON String (Array) | No | Overview widget config list (max 12 entries). |
| `omitted_segments` | JSON String (Object) | No | Event segment values to omit and clean from stored aggregates. |

### `event_map` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| ``eventKey.name`` | String | No | Display name override. If equals event key, it is removed from stored override. |
| ``eventKey.is_visible`` | Boolean | No | `false` hides event. `true` is normalized away from stored override. |

### `event_overview` Array Element Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `eventKey` | String | Yes | Event key shown in overview. Must exist in allowed event list. |
| `eventProperty` | String | Yes | Property metric: `dur`, `sum`, or `count`. |
| `is_event_group` | Boolean | No | Marks overview row as event-group item. Defaults to `false`. |
| `eventName` | String | No | Display name fallback. Auto-filled from `eventKey` when missing. |

### `omitted_segments` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| ``eventKey`` | Array of Strings | No | Segment keys to omit for the event. Omitted values are removed from aggregate segment data. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.event_limit` | `500` (fallback in code) | Input sanitization scope | Controls maximum event keys loaded from drill metadata while validating overview entries. |

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
| `result` | String | Metadata update status message. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"app_id\""
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Could not find event"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "You can't add more than 12 items in overview"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Events were updated sucessfully. There was error during clearing segment data. Please look in log for more onformation"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Metadata update only | No `omitted_segments` cleanup work | Normalizes map/order/overview payloads and updates `countly.events`. | Wrapped string `{ "result": "Success" }` |
| Metadata + segment cleanup | `omitted_segments` provided with values | Updates `countly.events`, then removes omitted segment data from aggregates and drill metadata. | Wrapped string `{ "result": "Success" }` |
| Cleanup warning | Metadata update succeeds, segment cleanup fails | Keeps metadata updates, returns warning error string. | Wrapped string with warning message |

### Impact on Other Data

- Removes omitted segment aggregates from `countly.events_data`.
- Updates/removes segment metadata entries in `countly_drill.drill_meta` when Drill is enabled.
- Removes hidden events from overview configuration automatically.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `events_updated` | After successful metadata update path | `{ update, before }` containing updated metadata and previous snapshot values. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level update permissions. |
| `countly.events` | Primary event metadata update target | Reads and updates `order`, `overview`, `map`, `omitted_segments`, and segment structures. |
| `countly.events_data` | Segment aggregate cleanup | Removes and unsets omitted segment values from event aggregate documents. |
| `countly_drill.drill_meta` | Drill metadata validation and cleanup | Reads event keys for overview sanitization and updates/removes omitted segment metadata. |

---
## Examples

### Example 1: Rename event and keep visible

```plaintext
/i/events/edit_map?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&event_map={"Purchase":{"name":"Completed Purchase","is_visible":true}}
```

### Example 2: Update overview and omit segment values

```plaintext
/i/events/edit_map?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&event_overview=[{"eventKey":"Purchase","eventProperty":"count"}]&omitted_segments={"Purchase":["test-segment","legacy-segment"]}
```

## Operational Considerations

- Segment omission can trigger heavy aggregate/drill cleanup work for large datasets.
- Large `omitted_segments` payloads can increase runtime and cleanup cost.
- Warning response indicates metadata update succeeded but segment cleanup encountered errors.

## Limitations

- Overview list is capped at 12 entries.
- Only `dur`, `sum`, and `count` are accepted `eventProperty` values in overview entries.

---
## Related Endpoints

- [Events - Event Visibility Update](i-events-change-visibility.md)
- [Events - Event Segment Whitelist](i-events-whitelist-segments.md)
- [Events - Event Delete](i-events-delete.md)

## Last Updated

2026-02-17
