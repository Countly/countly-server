---
sidebar_label: "Widget Add"
---

# Dashboards - Add Widget

## Endpoint

```text
/i/dashboards/add-widget
```

## Overview

Adds a widget to an existing dashboard. The endpoint validates dashboard access, validates widget shape, sanitizes note content, filters app IDs based on the current user's app access, inserts the widget, and links it to the dashboard.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

No separate feature permission flag is checked in this handler. Access is controlled by dashboard-level sharing rules:

- edit access required to add widgets,
- view-only users receive an explicit access-denied payload.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `dashboard_id` | String | Yes | Dashboard ID (24-char ObjectId string). |
| `widget` | JSON String (Object) | Yes | JSON-stringified widget payload. Must include at least `widget_type` and `apps`. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

### `widget` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `widget_type` | String | Yes | Widget type (for example `analytics`, `events`, `note`, `funnels`). |
| `apps` | Array | Yes | App IDs used by the widget. App IDs not accessible to the current user are removed before insert. |
| `feature` | String | No | Widget feature namespace. |
| `title` | String | No | Widget title shown in UI. |
| `position` | Array | No | Widget grid position, typically `[x, y]`. |
| `size` | Array | No | Widget size, typically `[w, h]`. |
| `contenthtml` | String | No | For `note` widgets, HTML content is sanitized and escaped before save. |

Decoded example:

```json
{
  "widget_type": "analytics",
  "feature": "core",
  "apps": ["6991c75b024cb89cdc04efd2"],
  "title": "Sessions Overview",
  "position": [0, 0],
  "size": [4, 3]
}
```

## Response

### Success Response

```json
"65e1f5f8a4f41a5f6f6d7703"
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root value)` | String | New widget ID. |
| `error` | Boolean | Present in access-denied branches. |
| `edit_access_denied` | Boolean | `true` when user has view access but not edit access. |
| `dashboard_access_denied` | Boolean | `true` when user has no access to the dashboard. |

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
  "result": "Invalid parameter: widget"
}
```

- `400`

```json
{
  "result": "Dashboard with the given id doesn't exist"
}
```

- `500`

```json
{
  "result": "Failed to create widget"
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
| Add widget | User has edit access | Parse and validate widget, sanitize note content, filter app IDs, insert widget, attach to dashboard. | Raw root string widget ID |
| View-only denied | User has view but not edit access | Skips insert and returns access-denied payload. | Raw object with `error` and `edit_access_denied` |
| No access denied | User has no dashboard access | Skips insert and returns access-denied payload. | Raw object with `error` and `dashboard_access_denied` |

### Impact on Other Data

- Inserts a new widget document into `countly.widgets`.
- Adds widget ID to `countly.dashboards.widgets` using `$addToSet`.
- Emits dashboard widget creation events for downstream listeners.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `widget_added` | After successful widget insert | Full inserted widget object |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and dashboard-share access checks | Reads current member record and group/share context for edit/view validation. |
| `countly.dashboards` | Parent dashboard lookup and update | Reads dashboard by `_id`; updates `widgets` array with new widget ID. |
| `countly.widgets` | Widget persistence | Inserts new widget document. |
| `countly.systemlogs` | Audit trail | Writes `widget_added` log entry via `/systemlogs` dispatch. |

---

## Examples

### Add analytics widget

```text
/i/dashboards/add-widget?
  dashboard_id=65e1f3d2a4f41a5f6f6d7701&
  widget={
    "widget_type":"analytics",
    "feature":"core",
    "apps":["6991c75b024cb89cdc04efd2"],
    "data_type":"session",
    "metrics":["t","u"],
    "title":"Sessions",
    "position":[0,0],
    "size":[4,3]
  }
```

### Add note widget

```text
/i/dashboards/add-widget?
  dashboard_id=65e1f3d2a4f41a5f6f6d7701&
  widget={
    "widget_type":"note",
    "feature":"core",
    "apps":["6991c75b024cb89cdc04efd2"],
    "title":"Release Note",
    "contenthtml":"<p>Q1 targets updated</p>",
    "position":[4,0],
    "size":[4,2]
  }
```

## Limitations

- The endpoint only enforces minimal widget validation (`widget_type` and `apps`). Widget-type-specific validation is handled later by widget data loaders.
- Invalid JSON in `widget` may degrade into validation failure because parsing errors are logged and processing continues.

## Related Endpoints

- [Dashboards - Update Widget](i-dashboards-update-widget.md)
- [Dashboards - Remove Widget](i-dashboards-remove-widget.md)
- [Dashboards - Read](o-dashboards.md)

## Last Updated

2026-02-17
