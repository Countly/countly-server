---
sidebar_label: "Widget Data Read"
---

# Dashboards - Read Widget Data

## Endpoint

```text
/o/dashboard/data
```

## Overview

Returns one dashboard widget object populated with widget data (`dashData`). Unlike `/o/dashboards/widget`, this endpoint loads full app objects and dispatches widget-type-specific data processors.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

No separate feature permission flag is checked. Access is controlled by dashboard-level view rules.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `dashboard_id` | String | Yes | Dashboard ID (24-char ObjectId string). |
| `widget_id` | String | Yes | Widget ID (24-char ObjectId string). |
| `period` | String | No | Optional period used by widget data processors. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `dashboards.sharing_status` | `true` | Sharing model | Controls whether broad sharing is possible. That affects whether non-owner users can access dashboard data reads. |

## Response

### Success Response

```json
{
  "_id": "65e1f5f8a4f41a5f6f6d7703",
  "widget_type": "analytics",
  "feature": "core",
  "apps": ["6991c75b024cb89cdc04efd2"],
  "metrics": ["t"],
  "dashData": {
    "isValid": true,
    "data": {
      "6991c75b024cb89cdc04efd2": {
        "t": 2145
      }
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `_id` | String | Widget ID. |
| `widget_type` | String | Widget type. |
| `apps` | Array | App IDs configured for the widget. |
| `dashData.isValid` | Boolean | Indicates whether widget data fetch succeeded. |
| `dashData.data` | Object | Widget data map keyed by app ID or widget-specific structure. |
| `error` | Boolean | Present in access-denied branch. |
| `dashboard_access_denied` | Boolean | `true` when user cannot view dashboard. |

### Error Responses

- `401`

```json
{
  "result": "Invalid parameter: dashboard_id"
}
```

- `401`

```json
{
  "result": "Invalid parameter: widget_id"
}
```

- `404`

```json
{
  "result": "Such dashboard and widget combination does not exist."
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
| Widget data read | Valid dashboard/widget pair and access granted | Loads widget metadata and full app documents, dispatches `/dashboard/data`, returns enriched widget. | Raw widget object |
| Access denied | User fails dashboard view check | Stops before data processing. | Raw object with `error` and `dashboard_access_denied` |

### Impact on Other Data

- Read-only endpoint; no writes.
- Data processors may read multiple feature collections depending on widget type.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and dashboard-share access checks | Reads current member record and group/share context for view validation. |
| `countly.dashboards` | Dashboard-widget relation validation | Reads dashboard containing target widget. |
| `countly.widgets` | Widget metadata | Reads selected widget document. |
| `countly.apps` | App metadata for widget processing | Reads full app documents for widget data dispatch context. |

---

## Examples

### Read data for one widget

```text
/o/dashboard/data?
  dashboard_id=65e1f3d2a4f41a5f6f6d7701&
  widget_id=65e1f5f8a4f41a5f6f6d7703&
  period=30days
```

## Operational Considerations

- Widget data computation can trigger heavy reads depending on widget type and configured apps.
- The response shape under `dashData.data` varies by widget type.

## Related Endpoints

- [Dashboards - Read Widget](o-dashboards-widget.md)
- [Dashboards - Read](o-dashboards.md)

## Last Updated

2026-02-17
