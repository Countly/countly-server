---
sidebar_label: "Group Delete"
---

# /i/event_groups/delete

## Endpoint

```plaintext
/i/event_groups/delete
```

## Overview

Deletes one or more event groups and removes their keys from `events.overview`.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires `Delete` permission on feature `core` for `app_id`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | Target app ID for delete permission check and filtering. |
| `args` | JSON String (Array) | Yes | Array of event-group IDs to delete. |

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
  "result": "Could not find event"
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
| Standard delete | Valid `args` array and permissions | Parses IDs, deletes matching groups by `_id` + `app_id`, then updates `events.overview`. | Wrapped string: `{ "result": "Success" }` |
| Overview cleanup | `events.overview` contains removed group keys | Removes matching keys from `overview` and persists updated array. | Wrapped string: `{ "result": "Success" }` |

### Impact on Other Data

- After deleting groups, the endpoint also mutates `countly.events.overview` to remove deleted group keys.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level delete permissions. |
| `countly.event_groups` | Group definition deletion | Removes event-group documents matching provided IDs and app scope. |
| `countly.events` | Event overview cleanup | Reads and updates `overview` after group deletion. |

## Examples

### Example 1: Delete one group

```plaintext
/i/event_groups/delete?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&args=["[CLY]_group_dfc09a75fff37cd46fa09d7c88ab77bb"]
```

### Example 2: Delete multiple groups

```plaintext
/i/event_groups/delete?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&args=["[CLY]_group_id_1","[CLY]_group_id_2"]
```

## Limitations

- `args` must be valid JSON array data.
- JSON parse failures in delete logic are not handled with a dedicated parse-error response branch.

---

## Related Endpoints

- [Event Groups - Group Create](i-event-groups-create.md)
- [Event Groups - Group Update](i-event-groups-update.md)

## Last Updated

2026-02-17