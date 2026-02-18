---
sidebar_label: "Widget Update"
---

# Dashboards - Update Widget

## Endpoint

```text
/i/dashboards/update-widget
```

## Overview

Updates an existing widget in a dashboard. The endpoint validates access, sanitizes note content, optionally removes `isPluginWidget` for core widgets, and saves updated widget fields.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

No separate feature permission flag is checked. Dashboard sharing rules enforce:

- edit access required to update,
- explicit payload for view-only and no-access paths.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `dashboard_id` | String | Yes | Dashboard ID (24-char ObjectId string). |
| `widget_id` | String | Yes | Widget ID (24-char ObjectId string). |
| `widget` | JSON String (Object) | Yes | JSON-stringified widget update payload. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

### `widget` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `widget_type` | String | No | Widget type. Used for note sanitization checks. |
| `apps` | Array | No | App IDs; inaccessible app IDs are removed before save. |
| `feature` | String | No | If set to `core`, endpoint removes `isPluginWidget` from stored document. |
| `contenthtml` | String | No | For note widgets, content is sanitized and escaped. |
| `title` | String | No | Widget title. |
| `position` | Array | No | Widget grid position. |
| `size` | Array | No | Widget size. |

Decoded example:

```json
{
  "widget_type": "analytics",
  "feature": "core",
  "apps": ["6991c75b024cb89cdc04efd2"],
  "title": "Sessions (Last 30 Days)",
  "metrics": ["t", "u"],
  "position": [0, 0],
  "size": [4, 3]
}
```

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
  "result": "Failed to update widget"
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
| Update widget | User has edit access | Parses widget, sanitizes note content, filters app IDs, updates widget document, logs update. | Wrapped `{ "result": "Success" }` |
| View-only denied | User has view but not edit access | Stops without update. | Raw object with `error` and `edit_access_denied` |
| No access denied | User has no dashboard access | Stops without update. | Raw object with `error` and `dashboard_access_denied` |

### Impact on Other Data

- Updates widget document in `countly.widgets`.
- Emits dashboard widget updated event for dependent processors.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `widget_edited` | After successful widget update | `{ before, update }` object |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and dashboard-share access checks | Reads current member record and group/share context for edit/view validation. |
| `countly.dashboards` | Dashboard-widget relationship validation | Confirms widget belongs to dashboard before update. |
| `countly.widgets` | Widget persistence | Updates widget document via `findAndModify`. |
| `countly.systemlogs` | Audit trail | Writes `widget_edited` entry. |

---

## Examples

### Update analytics widget

```text
/i/dashboards/update-widget?
  dashboard_id=65e1f3d2a4f41a5f6f6d7701&
  widget_id=65e1f5f8a4f41a5f6f6d7703&
  widget={
    "widget_type":"analytics",
    "feature":"core",
    "apps":["6991c75b024cb89cdc04efd2"],
    "title":"Sessions by Day",
    "metrics":["t"],
    "position":[0,0],
    "size":[6,3]
  }
```

### Update note widget

```text
/i/dashboards/update-widget?
  dashboard_id=65e1f3d2a4f41a5f6f6d7701&
  widget_id=65e1f5f8a4f41a5f6f6d7703&
  widget={
    "widget_type":"note",
    "feature":"core",
    "apps":["6991c75b024cb89cdc04efd2"],
    "title":"Team Note",
    "contenthtml":"<p>Review this week's funnel drop-off</p>"
  }
```

## Limitations

- Invalid JSON in `widget` is logged and then handled through later validation/update branches; it does not return a dedicated parse-error response.
- The endpoint does not perform schema-level validation for every widget-specific key.

## Related Endpoints

- [Dashboards - Add Widget](i-dashboards-add-widget.md)
- [Dashboards - Remove Widget](i-dashboards-remove-widget.md)

## Last Updated

2026-02-17
