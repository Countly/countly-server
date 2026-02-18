---
sidebar_label: "Event Segment Whitelist"
---

# /i/events/whitelist_segments

## Endpoint

```plaintext
/i/events/whitelist_segments
```

## Overview

Set or unset per-event whitelisted segment keys in event metadata.

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
| `whitelisted_segments` | JSON String (Object) | Yes | Map of event keys to segment arrays. Non-empty arrays are set; empty arrays unset existing whitelist entries. |

### `whitelisted_segments` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `<eventKey>` | Array of Strings | No | Segment names to whitelist for the given event. Empty array removes whitelist entry for that event key. |

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
| `result` | String | Whitelist update status. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Could not find record in event collection"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Value for 'whitelisted_segments' missing"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Set whitelist entries | Event key maps to non-empty segment array | Writes `$set` updates under `whitelisted_segments.<eventKey>`. | Wrapped string `{ "result": "Success" }` |
| Unset whitelist entries | Event key maps to empty array | Writes `$unset` updates for `whitelisted_segments.<eventKey>`. | Wrapped string `{ "result": "Success" }` |

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `segments_whitelisted_for_events` | After successful whitelist update | `{ update }` containing serialized `$set`/`$unset` whitelist metadata changes. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level update permissions. |
| `countly.events` | Whitelist metadata update target | Reads app event metadata document and updates `whitelisted_segments` fields. |

---
## Examples

### Example 1: Set whitelist for purchase event

```plaintext
/i/events/whitelist_segments?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&whitelisted_segments={"Purchase":["country","platform"]}
```

### Example 2: Remove whitelist entry

```plaintext
/i/events/whitelist_segments?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001&whitelisted_segments={"Purchase":[]}
```

## Limitations

- Missing `whitelisted_segments` payload is rejected.
- Invalid JSON payloads can degrade to empty updates depending on parse outcome.

---
## Related Endpoints

- [Events - Event Mapping Update](i-events-edit-map.md)
- [Events - Event Visibility Update](i-events-change-visibility.md)

## Last Updated

2026-02-17