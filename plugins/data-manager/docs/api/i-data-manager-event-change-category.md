---
sidebar_label: "Event Category Update"
---

# /i/data-manager/event/change-category

## Endpoint

```plaintext
/i/data-manager/event/change-category
```

## Overview

Assigns or changes category mapping for one or more events in the selected app's event map.

## Authentication

Countly API supports three authentication methods:

1. **API Key** (parameter): `api_key=YOUR_API_KEY`
2. **Auth Token** (parameter): `auth_token=YOUR_AUTH_TOKEN`
3. **Auth Token** (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Required permission: `data_manager` `Update`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | Target app ID. |
| `events` | JSON String (Array) | Yes | JSON-stringified array of event keys to update. |
| `category` | String | Yes | Category name/value to assign in event map. |

Example:

```json
{
  "events": ["Purchase Completed", "Checkout Started"],
  "category": "Revenue"
}
```

## Response

### Success Response

```json
"Success"
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | String | Raw string `Success`. |

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

- Validates update access for `data_manager`.
- Parses `events` JSON string and loads app event document.
- Ensures `events.map` exists and sets `map[event].category` for each provided event key.
- Persists updated map back to events document.

### Impact on Other Data

- Updates `map.{event}.category` entries in `countly.events` app document.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `dm-event-edit` | Dispatched once per event after update attempt | `{ ev: event_key, category: category_value }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify update access. |
| `countly.apps` | App context validation | Reads app record for the requested `app_id` during access validation. |
| `countly.events` | Stores event definitions, segments, and map metadata per app | Reads app event document and updates event-category mappings in `map`. |
| `countly.systemlogs` | Stores audit trail for management actions | Receives one audit entry per event updated. |

## Examples

### Assign Revenue category to two events

```plaintext
/i/data-manager/event/change-category?api_key=YOUR_API_KEY&app_id=YOUR_APP_ID&events=["Purchase Completed","Checkout Started"]&category=Revenue
```

## Limitations

- If app event document is missing or malformed, endpoint returns generic `Error`.
- Events not present in map are created in map with only `category` field.

## Related Endpoints

- [Data Manager - Events Read](o-data-manager-events.md)
- [Data Manager - Categories Read](o-data-manager-category.md)

## Last Updated

2026-02-17
