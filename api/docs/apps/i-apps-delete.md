---
sidebar_label: "App Delete"
---

# /i/apps/delete

## Endpoint

```plaintext
/i/apps/delete
```

## Overview

Delete an app and trigger full app-data cleanup across core and integrated feature datasets.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Global admin permission is required by route-level validation.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `args` | JSON String (Object) | Yes | Delete payload. |

### `args` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `app_id` | String | Yes | App ID to delete. |

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
  "result": "Error: Validation error details"
}
```

**Status Code**: `403 Forbidden`
```json
{
  "result": "Application is locked"
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "Error deleting app"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| App delete | App exists and is not locked | Removes app record, removes app image, clears app references in members/groups, starts app data cleanup flow. | Wrapped string `{ "result": "Success" }` |
| Locked app blocked | App exists and `locked` is true | Rejects deletion without cleanup. | Wrapped string `{ "result": "Application is locked" }` |

### Impact on Other Data

- Removes app permission references from member and group documents.
- Removes app-user collections and app-merge collections.
- Removes aggregated and granular analytics data for the app.
- Dispatches app-delete integration hooks for additional feature cleanup.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.apps` | App definition removal | Deletes the target app document. |
| `countly.members` | Permission cleanup | Pulls deleted app from `apps`, `admin_of`, `user_of`, and permission maps. |
| `countly.groups` | Group permission cleanup | Removes deleted app from group permission structures when Groups is enabled. |
| `countly.app_users{appId}` | App-user data cleanup | Drops app-user profile collection for deleted app. |
| `countly.app_user_merges` | Merge metadata cleanup | Removes merge metadata entries for deleted app. |
| `countly.app_user_merges{appId}` | Legacy merge cleanup | Drops app-specific merge collection. |
| `countly.users`, `countly.carriers`, `countly.devices`, `countly.device_details`, `countly.cities` | Aggregated analytics cleanup | Removes app-scoped aggregated analytics documents. |
| `countly.top_events` | Top events cleanup | Removes top-events rows for the deleted app. |
| `countly.events` | Event metadata cleanup | Removes app event metadata document. |
| `countly.events_data` | Event aggregate cleanup | Removes app event aggregate documents. |
| `countly.long_tasks` | Task cleanup | Deletes app-scoped long-task records and results. |
| `countly.notes` | Notes cleanup | Removes app-scoped notes. |
| `countly_drill.drill_events` | Granular event cleanup | Removes app granular events through granular-data cleanup flow. |
| `countly_drill.drill_meta` | Drill metadata cleanup | Removes app drill metadata documents. |
| `countly_fs` | App image cleanup | Deletes app image from app image storage. |

---
## Examples

### Example 1: Delete app

```plaintext
/i/apps/delete?api_key=YOUR_API_KEY&args={"app_id":"64b0ac10c2c3ce0012dd1001"}
```

```json
{
  "result": "Success"
}
```

## Operational Considerations

- This endpoint is destructive and should be treated as irreversible.
- Cleanup spans many collections and integrations; endpoint success means cleanup was initiated and core deletion path completed.
- For large apps, full cleanup can take noticeable time across background operations.

## Limitations

- Locked apps cannot be deleted.
- Route-level validation requires global admin access.

---
## Related Endpoints

- [Apps - App Reset](i-apps-reset.md)
- [Apps - App Read All](o-apps-all.md)

## Last Updated

2026-02-17