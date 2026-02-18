---
sidebar_label: "Delete"
---

# Views - Delete

## Endpoint

```text
/i/views?method=delete_view
```

## Overview

Deletes one or more views and removes associated aggregated/user-level view data plus related drill action/view records.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `views` `Delete` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `delete_view`. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | Target app ID. |
| `view_id` | String | Yes | Comma-separated list of view IDs to delete. |

## Response

### Success Response

```json
{
  "result": true
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Boolean | `true` when delete flow completes; `false` if caught exception path is used. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

- `401`

```json
{
  "result": "User does not have right"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Delete success | Delete loop completes | Removes metadata/data entries for each listed view and dispatches cleanup hooks. | Raw object: `{ "result": true }` |
| Delete failure | Exception in delete flow | Stops in catch path and returns failure flag. | Raw object: `{ "result": false }` |

### Impact on Other Data

- Removes matching view rows from `countly.app_viewdata` and `countly.app_viewsmeta`.
- Unsets deleted view IDs from user-view maps in `countly.app_userviews` and `countly.app_userviews{appId}`.
- Dispatches granular deletes for `[CLY]_view` and `[CLY]_action` in drill events.
- Dispatches `/view/delete` hook for downstream cleanup in other features.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and access rights for delete validation. |
| `countly.apps` | App validation/context loading | Validates `app_id` for delete scope. |
| `countly.views` | View root metadata lookup | Reads app-level views root document before delete operations. |
| `countly.app_viewsmeta` | View metadata deletion | Deletes metadata entries for removed view IDs. |
| `countly.app_viewdata` | Aggregated view metric deletion | Deletes metric docs matching removed view IDs (`vw`). |
| `countly.app_userviews` | User-view map cleanup (main) | Unsets deleted view fields from user view map documents. |
| `countly.app_userviews{appId}` | User-view map cleanup (legacy app collection) | Unsets deleted view fields from legacy user view map documents. |
| `countly_drill.drill_events` | Granular event cleanup | Deletes `[CLY]_view` and `[CLY]_action` records linked to deleted views. |

---

## Examples

### Delete one view

```text
/i/views?
  method=delete_view&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  view_id=6991c75b024cb89cdc04efd2_home
```

### Delete multiple views

```text
/i/views?
  method=delete_view&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  view_id=6991c75b024cb89cdc04efd2_home,6991c75b024cb89cdc04efd2_checkout
```

## Operational Considerations

- Deletion is destructive and cannot be reversed.
- Multi-view requests run per-view cleanup in sequence of async operations; partial cleanup can occur if a later step fails.

## Limitations

- `view_id` must be passed as a comma-separated string, not an array parameter.

## Related Endpoints

- [Views - Rename](i-views-rename.md)
- [Views - Omit Segments](i-views-omit-segments.md)

## Last Updated

2026-02-17
