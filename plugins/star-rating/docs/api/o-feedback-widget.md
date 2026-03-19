---
sidebar_label: "Get Widget Details"
---

# Star Rating - Get Widget Details

## Endpoint

```plaintext
/o/feedback/widget
```

## Overview

Returns one widget document by `widget_id`.

## Authentication

This endpoint accepts requests without API authentication parameters.

## Permissions

This endpoint does not enforce role-based feature permission checks.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `widget_id` | String | Yes | Widget ObjectID. |
| `nfd` | Boolean/String | No | If truthy, increments widget show counter. |

## Response

### Success Response

```json
{
  "_id": "67a3d2f5c1a23b0f4d6c0201",
  "app_id": "6991c75b024cb89cdc04efd2",
  "type": "rating",
  "status": true,
  "popup_header_text": "Rate this page"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Full widget document. |
| `_id` | String | Widget ID. |
| `status` | Boolean | Active/inactive status flag. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"widget_id\""
}
```

- `404`

```json
{
  "result": "Widget not found."
}
```

- `500`

```json
{
  "result": "database error message"
}
```

## Behavior/Processing

- Converts `widget_id` to ObjectID and loads widget from `feedback_widgets`.
- When `nfd` is set, increments `timesShown` counter asynchronously.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.feedback_widgets` | Widget source | Reads widget by ID and optionally increments `timesShown`. |

## Examples

### Read widget details

```plaintext
/o/feedback/widget?
  widget_id=67a3d2f5c1a23b0f4d6c0201
```

## Related Endpoints

- [Star Rating - List All Widgets](o-feedback-widgets.md)
- [Star Rating - Get Multiple Widgets](o-feedback-multiple-widgets-by-id.md)

## Last Updated

2026-03-07
