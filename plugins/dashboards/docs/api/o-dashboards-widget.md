---
sidebar_label: "Widget Read"
---

# Dashboards - Read Widget

## Endpoint

```text
/o/dashboards/widget
```

## Overview

Returns one widget (as a single-item array) for a specific dashboard/widget pair, including widget data (`dashData`) resolved by widget processors.

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
| `period` | String | No | Optional period used by widget data loaders. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `dashboards.sharing_status` | `true` | Sharing model | Controls whether broad sharing is possible. That affects whether non-owner users can access widget reads for shared dashboards. |

## Response

### Success Response

```json
[
  {
    "_id": "65e1f5f8a4f41a5f6f6d7703",
    "widget_type": "analytics",
    "feature": "core",
    "apps": ["6991c75b024cb89cdc04efd2"],
    "dashData": {
      "isValid": true,
      "data": {
        "6991c75b024cb89cdc04efd2": {
          "t": 2145
        }
      }
    }
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Root array containing the matched widget entry. |
| `[]._id` | String | Widget ID. |
| `[].widget_type` | String | Widget type. |
| `[].apps` | Array | App IDs configured for widget. |
| `[].dashData` | Object | Computed widget data container. |
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
| Widget read | Valid dashboard/widget pair and access granted | Reads widget metadata, maps widget, loads app summaries, fetches widget data. | Raw single-item widget array |
| Access denied | User fails dashboard view check | Stops before widget data load. | Raw object with `error` and `dashboard_access_denied` |

### Impact on Other Data

- Read-only endpoint; no writes.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and dashboard-share access checks | Reads current member record and group/share context for view validation. |
| `countly.dashboards` | Dashboard-widget relation validation | Reads dashboard that must include `widget_id`. |
| `countly.widgets` | Widget metadata and data processing input | Reads widget document by `_id`. |
| `countly.apps` | App summary enrichment | Reads app documents linked in widget `apps`. |

---

## Examples

### Read one widget

```text
/o/dashboards/widget?
  dashboard_id=65e1f3d2a4f41a5f6f6d7701&
  widget_id=65e1f5f8a4f41a5f6f6d7703&
  period=7days
```

## Related Endpoints

- [Dashboards - Read Widget Data](o-dashboard-data.md)
- [Dashboards - Read Widget Layout](o-dashboards-widget-layout.md)

## Last Updated

2026-02-17
