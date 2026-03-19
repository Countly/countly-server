---
sidebar_label: "Widget Layout Read"
---

# Dashboards - Read Widget Layout

## Endpoint

```text
/o/dashboards/widget-layout
```

## Overview

Returns layout metadata (`position`, `size`) for all widgets linked to a dashboard.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

This endpoint requires authenticated user context but does not enforce dashboard sharing access checks.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `dashboard_id` | String | Yes | Dashboard ID used to fetch widget references. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Response

### Success Response

```json
[
  {
    "_id": "65e1f5f8a4f41a5f6f6d7703",
    "position": [0, 0],
    "size": [4, 3]
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Root array of widget layout objects. |
| `[]._id` | String | Widget ID. |
| `[].position` | Array | Widget grid position. |
| `[].size` | Array | Widget dimensions. |

### Error Responses

This handler does not return explicit structured error payloads for dashboard lookup failures.

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Layout read | Dashboard exists | Reads dashboard widget IDs and fetches layout fields from widgets collection. | Raw array of layout objects |
| Silent failure path | Dashboard read fails or dashboard missing | Handler currently does not send an explicit error response in this branch. | No structured payload |

### Impact on Other Data

- Read-only endpoint; no writes.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication | Reads current member record via `authenticated-user validation` before dashboard query. |
| `countly.dashboards` | Dashboard widget reference lookup | Reads dashboard `widgets` array. |
| `countly.widgets` | Layout metadata lookup | Reads `_id`, `position`, and `size` for referenced widgets. |

---

## Examples

### Read widget layout for one dashboard

```text
/o/dashboards/widget-layout?
  dashboard_id=65e1f3d2a4f41a5f6f6d7701
```

## Limitations

- The handler does not enforce dashboard view permissions.
- Dashboard lookup errors do not return a stable error payload from this route.

## Related Endpoints

- [Dashboards - Read Widget](o-dashboards-widget.md)
- [Dashboards - Read](o-dashboards.md)

## Last Updated

2026-02-17
