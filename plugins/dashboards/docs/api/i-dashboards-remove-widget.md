---
sidebar_label: "Widget Remove"
---

# Dashboards - Remove Widget

## Endpoint

```text
/i/dashboards/remove-widget
```

## Overview

Removes a widget from a dashboard and deletes the widget document.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

No separate feature permission flag is checked in this handler. Dashboard sharing rules control access:

- edit access is required for removal,
- view-only and no-access users get explicit denial payloads.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `dashboard_id` | String | Yes | Dashboard ID (24-char ObjectId string). |
| `widget_id` | String | Yes | Widget ID (24-char ObjectId string). |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

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
| `result` | String | Success or error message in wrapped responses. |
| `error` | Boolean | Present in access-denied branches. |
| `edit_access_denied` | Boolean | `true` when user has view access but no edit access. |
| `dashboard_access_denied` | Boolean | `true` when user has no dashboard access. |

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
  "result": "Invalid parameter: widget_id"
}
```

- `400`

```json
{
  "result": "Such dashboard and widget combination does not exist."
}
```

- `500`

```json
{
  "result": "Failed to remove widget"
}
```

- `200` (view-only access)

```json
{
  "error": true,
  "edit_access_denied": true
}
```

- `200` (no dashboard access)

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
| Remove widget | User has edit access | Pulls widget ID from dashboard, deletes widget document, logs action. | Wrapped `{ "result": "Success" }` |
| View-only denied | User has view but not edit access | Stops without modifications. | Raw object with `error` and `edit_access_denied` |
| No access denied | User has no dashboard access | Stops without modifications. | Raw object with `error` and `dashboard_access_denied` |

### Impact on Other Data

- Updates `countly.dashboards.widgets` with `$pull`.
- Deletes widget from `countly.widgets`.
- Dispatches widget deleted event to dashboard listeners.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `widget_deleted` | After successful dashboard pull and widget delete | Deleted widget payload plus dashboard name |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and dashboard-share access checks | Reads current member record and group/share context for edit/view validation. |
| `countly.dashboards` | Ownership and linkage update | Reads dashboard-widget relationship and removes widget ID from dashboard. |
| `countly.widgets` | Widget storage | Deletes widget document by `_id`. |
| `countly.systemlogs` | Audit trail | Writes `widget_deleted` entry. |

---

## Examples

### Remove one widget

```text
/i/dashboards/remove-widget?
  dashboard_id=65e1f3d2a4f41a5f6f6d7701&
  widget_id=65e1f5f8a4f41a5f6f6d7703
```

## Limitations

- The handler parses `widget` if passed, but does not use it for deletion logic.
- Successful delete requires both dashboard update and widget delete to complete.

## Related Endpoints

- [Dashboards - Add Widget](i-dashboards-add-widget.md)
- [Dashboards - Update Widget](i-dashboards-update-widget.md)

## Last Updated

2026-02-17
