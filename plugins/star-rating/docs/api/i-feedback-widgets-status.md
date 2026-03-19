---
sidebar_label: "Toggle Widget Status"
---

# Star Rating - Toggle Widget Status

## Endpoint

```plaintext
/i/feedback/widgets/status
```

## Overview

Bulk-updates `status` field for multiple feedback widgets.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `star_rating` `Update` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `data` | String (JSON Object) | Yes | Map of widget IDs to boolean-like status values. |
| `data.[widgetId]` | Boolean/String | Yes | `true` or `false` status for the widget. |

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
| `result` | String | `Success` when bulk status update is applied. |

### Error Responses

- `500`

```json
{
  "result": "Invalid parameter 'data'"
}
```

- `400`

```json
{
  "result": "Nothing to update"
}
```

- `400`

```json
{
  "result": "bulk error object"
}
```

Standard authentication/authorization errors from update validation can also be returned.

## Behavior/Processing

- Parses `data` JSON object.
- Converts each value to boolean (`true` or `'true'` => `true`, otherwise `false`).
- Executes unordered bulk updates on `feedback_widgets.status`.
- Emits `surveys_widget_status` system log action with submitted status map.

### Impact on Other Data

- Updates status on multiple widget documents.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.feedback_widgets` | Widget storage | Bulk updates `status` values for provided widget IDs. |
| `countly.systemlogs` | Audit trail | Receives `surveys_widget_status` action with status payload. |

## Examples

### Disable two widgets in one call

```plaintext
/i/feedback/widgets/status?
  api_key=YOUR_API_KEY&
  data={"67a3d2f5c1a23b0f4d6c0201":false,"67a3d2f5c1a23b0f4d6c0202":false}
```

## Related Endpoints

- [Star Rating - Edit Widget](i-feedback-widgets-edit.md)
- [Star Rating - List All Widgets](o-feedback-widgets.md)

## Last Updated

2026-03-07
