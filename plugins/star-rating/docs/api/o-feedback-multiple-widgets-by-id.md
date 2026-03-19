---
sidebar_label: "Get Multiple Widgets"
---

# Star Rating - Get Multiple Widgets

## Endpoint

```plaintext
/o/feedback/multiple-widgets-by-id
```

## Overview

Returns multiple widgets by ID list.

## Authentication

This endpoint accepts requests without API authentication parameters.

## Permissions

This endpoint does not enforce role-based feature permission checks.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `widgets` | String (JSON Array) | Yes | Array of widget ID strings. |

## Response

### Success Response

```json
[
  {
    "_id": "67a3d2f5c1a23b0f4d6c0201",
    "app_id": "6991c75b024cb89cdc04efd2",
    "type": "rating",
    "status": true
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Array | Widget list for requested IDs. |
| `[]` | Object | One widget document. |

### Error Responses

- `500`

```json
{
  "result": "You should provide widget ids array."
}
```

- `500`

```json
{
  "result": "database error message"
}
```

- `404` (only in `from_survey` branch)

```json
{
  "result": "Widgets not found."
}
```

## Behavior/Processing

- Parses `widgets` JSON array.
- Converts each item to ObjectID and queries `feedback_widgets` with `$in`.
- Returns empty array when no docs found in normal branch.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.feedback_widgets` | Widget source | Reads widgets by provided ID list. |

## Examples

### Read two widgets by IDs

```plaintext
/o/feedback/multiple-widgets-by-id?
  widgets=["67a3d2f5c1a23b0f4d6c0201","67a3d2f5c1a23b0f4d6c0202"]
```

## Related Endpoints

- [Star Rating - Get Widget Details](o-feedback-widget.md)
- [Star Rating - List All Widgets](o-feedback-widgets.md)

## Last Updated

2026-03-07
