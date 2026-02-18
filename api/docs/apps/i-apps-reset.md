---
sidebar_label: "App Reset"
---

# /i/apps/reset

## Endpoint

```plaintext
/i/apps/reset
```

## Overview

Reset app data either fully or for a bounded historical period while keeping the app definition.

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
| `args` | JSON String (Object) | Yes | Reset payload. |

### `args` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `app_id` | String | Yes | App ID to reset. |
| `period` | String | Yes | Data reset scope: `all`, `reset`, `1month`, `3month`, `6month`, `1year`, or `2year`. |

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
| `result` | String | Reset status string. |

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

**Status Code**: `404 Not Found`
```json
{
  "result": "App not found"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Full reset/clear | `period` is `all` or `reset` | Clears app-wide analytics and user datasets, resets or reinitializes core app state as required. | Wrapped string `{ "result": "Success" }` |
| Bounded retention reset | `period` is one of `1month`, `3month`, `6month`, `1year`, `2year` | Deletes data older than selected period while preserving recent buckets. | Wrapped string `{ "result": "Success" }` |

### Impact on Other Data

- Clears app-user, event, and aggregate analytics data based on selected reset mode.
- Triggers app clear/reset integration hooks so feature modules can clean app-scoped data.
- Cleans granular drill data with app/time scoped filters.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.apps` | App state reset | Reads app and may reset app sequence state for full reset flows. |
| `countly.app_users{appId}` | User analytics reset | Removes or prunes app-user profile/activity data. |
| `countly.app_user_merges` and `countly.app_user_merges{appId}` | Merge state cleanup | Removes merge metadata tied to reset app data scope. |
| `countly.users`, `countly.carriers`, `countly.devices`, `countly.device_details`, `countly.cities` | Aggregated analytics reset | Removes app-scoped aggregate documents outside retained period. |
| `countly.events` | Event metadata retention/reset | Keeps or resets event metadata depending on reset mode. |
| `countly.events_data` | Event aggregate cleanup | Removes event aggregate documents outside retained reset scope. |
| `countly.long_tasks` | Task cleanup | Deletes app-scoped long-task records during cleanup. |
| `countly_drill.drill_events` | Granular event cleanup | Removes granular events outside retained period or for full reset. |
| `countly_drill.drill_meta` | Drill metadata cleanup | Removes or prunes app drill metadata. |

---
## Examples

### Example 1: Full reset keeping app definition

```plaintext
/i/apps/reset?api_key=YOUR_API_KEY&args={"app_id":"64b0ac10c2c3ce0012dd1001","period":"all"}
```

### Example 2: Keep last 6 months only

```plaintext
/i/apps/reset?api_key=YOUR_API_KEY&args={"app_id":"64b0ac10c2c3ce0012dd1001","period":"6month"}
```

## Operational Considerations

- Reset operations are destructive for selected historical scope.
- Large apps can take significant cleanup time across aggregate and granular datasets.
- Success response indicates reset flow started and completed core trigger path; background cleanup may continue.

## Limitations

- Locked apps cannot be reset.
- Route-level validation requires global admin access.

---
## Related Endpoints

- [Apps - App Delete](i-apps-delete.md)
- [Apps - App Read Details](o-apps-details.md)

## Last Updated

2026-02-17