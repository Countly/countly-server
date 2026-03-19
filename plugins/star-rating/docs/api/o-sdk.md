---
sidebar_label: "Get Ratings Widgets"
---

# Star Rating - Get Ratings Widgets

## Endpoint

```plaintext
/o/sdk?method=feedback
```

## Overview

Returns active rating widgets formatted for SDK consumption.

## Authentication

Uses SDK authentication (`app_key`, `device_id`) on `/o/sdk` path.

## Permissions

No role-based feature permission checks are required for this endpoint.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `feedback`. |
| `app_key` | String | Yes | App key for SDK request validation. |
| `device_id` | String | Yes | Device ID for SDK request validation. |
| `av` | String | No | Optional app version in SDK request context. |

## Response

### Success Response

```json
{
  "result": [
    {
      "_id": "67a3d2f5c1a23b0f4d6c0201",
      "type": "rating",
      "appearance": {
        "position": "mleft",
        "bg_color": "#0166D6",
        "text_color": "#FFFFFF",
        "text": "Feedback",
        "size": "m"
      },
      "tg": ["/"],
      "name": "Rate this page",
      "showPolicy": "afterPageLoad"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | Array | SDK-visible rating widget list. |
| `result[]` | Object | One widget object transformed by `/feedback/widgets` handler. |
| `result[].appearance` | Object | Derived appearance object built from trigger style fields. |
| `result[].tg` | Array | Target page paths (`target_pages` alias). |
| `result[].name` | String | Widget display name (`popup_header_text` alias). |

### Error Responses

- SDK validation errors from `/o/sdk` authentication path can be returned (for example missing/invalid `app_key` or `device_id`).

## Behavior/Processing

- Endpoint returns only when `method=feedback` and Surveys plugin is disabled.
- Dispatches `/feedback/widgets` and wraps returned widget array in `{ "result": [...] }`.
- Filters to widgets with `status=true` and `type="rating"` for current app.
- Applies cohort-based filtering when Cohorts plugin is enabled.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.feedback_widgets` | Widget source | Reads active rating widgets for app. |

## Examples

### Get SDK widgets

```plaintext
/o/sdk?
  method=feedback&
  app_key=YOUR_APP_KEY&
  device_id=device_123
```

## Limitations

- If Surveys plugin is enabled, this endpoint branch does not respond (`false` is returned to router chain).

## Related Endpoints

- [Star Rating - List All Widgets](o-feedback-widgets.md)

## Last Updated

2026-03-07
