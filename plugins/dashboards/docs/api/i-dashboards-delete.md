---
sidebar_label: "Dashboard Delete"
---

# Dashboards - Delete

## Endpoint

```text
/i/dashboards/delete
```

## Overview

Deletes a dashboard and all widgets linked from that dashboard. Non-global-admin users can only delete dashboards they own.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

No separate feature permission flag is checked. Access is enforced by:

- dashboard visibility check,
- owner-only delete rule for non-global-admin users.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `dashboard_id` | String | Yes | Dashboard ID (24-char ObjectId string). |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `dashboards.sharing_status` | `true` | Sharing model | Influences whether shared dashboards can exist broadly. This can indirectly affect which users can reach delete checks for a given dashboard. |

## Response

### Success Response

```json
{
  "acknowledged": true,
  "deletedCount": 1
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `acknowledged` | Boolean | Database delete operation acknowledgment. |
| `deletedCount` | Number | Number of dashboards deleted. |
| `error` | Boolean | Present in access-denied branch. |
| `dashboard_access_denied` | Boolean | `true` when user cannot view dashboard. |

### Error Responses

- `400`

```json
{
  "result": "Invalid parameter: dashboard_id"
}
```

- `400`

```json
{
  "result": "Dashboard with the given id doesn't exist"
}
```

- `404`

```json
{
  "result": "Dashboard not found"
}
```

- `500`

```json
{
  "result": "Failed to delete dashboard"
}
```

- `500`

```json
{
  "result": "An error occurred while deleting the dashboard"
}
```

- `200` (no access)

```json
{
  "error": true,
  "dashboard_access_denied": true
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Delete success | Dashboard exists and user passes access/ownership checks | Deletes all linked widgets first, then deletes dashboard. | Raw object with `acknowledged` and `deletedCount` |
| View denied | User fails dashboard view check | Stops before delete. | Raw object with `error` and `dashboard_access_denied` |
| Not owner | Non-admin user targeting another user's dashboard | Owner-filtered lookup fails. | Wrapped `result` message `Dashboard not found` |

### Impact on Other Data

- Removes linked widget documents from `countly.widgets`.
- Removes one dashboard document from `countly.dashboards`.
- Dispatches widget deletion events for each removed widget.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `dashboard_deleted` | After successful dashboard deletion | Deleted dashboard document |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and ownership checks | Reads current member record to enforce owner/global-admin delete constraints. |
| `countly.dashboards` | Dashboard validation and delete | Reads dashboard for checks; deletes target dashboard. |
| `countly.widgets` | Cascade cleanup | Deletes widget documents referenced by dashboard. |
| `countly.systemlogs` | Audit trail | Writes `dashboard_deleted` entry. |

---

## Examples

### Delete own dashboard

```text
/i/dashboards/delete?
  dashboard_id=65e1f3d2a4f41a5f6f6d7701
```

## Operational Considerations

- Delete flow performs per-widget deletion before dashboard removal, so dashboards with many widgets can take longer to complete.
- Widget-dependent listeners receive delete events for every removed widget.

## Limitations

- Non-global-admin users cannot delete dashboards they do not own, even if they have shared access.

## Related Endpoints

- [Dashboards - Read](o-dashboards.md)
- [Dashboards - Remove Widget](i-dashboards-remove-widget.md)

## Last Updated

2026-02-17
