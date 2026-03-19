---
sidebar_label: "Edit Widget"
---

# Star Rating - Edit Widget

## Endpoint

```plaintext
/i/feedback/widgets/edit
```

## Overview

Updates an existing star-rating widget definition.

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
| `widget_id` | String | Yes | Target widget ObjectID. |
| `app_id` | String | Yes | App ID in widget payload validation schema. |
| `status` | Boolean/String | Yes | Active flag for widget. |
| `target_pages` | Array/String | No | JSON array string is preprocessed to array (fallback `['/']`). |
| `targeting` | Object/String | No | JSON object string for cohort targeting. |
| `links` | Array/String | No | JSON array string for links. |
| `ratings_texts` | Array/String | No | JSON array string for rating labels. |

Additional optional widget fields are validated using the server-side widget schema.

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
| `result` | String | `Success` when widget update path completes. |

### Error Responses

- `500`

```json
{
  "result": "Invalid widget id."
}
```

- `400`

```json
{
  "result": "Invalid params: ..."
}
```

- `404`

```json
{
  "result": "Widget not found"
}
```

- `400`

```json
{
  "result": "widget updated. Error to update cohort"
}
```

- `400`

```json
{
  "result": "widget updated. Error to create cohort"
}
```

Standard authentication/authorization errors from update validation can also be returned.

## Behavior/Processing

- Converts `widget_id` to ObjectID and validates full widget payload.
- Applies widget field preprocessors before validation (`target_pages`, `targeting`, `links`, `ratings_texts`, `status`, `hide_sticker`).
- Updates `feedback_widgets` document via `findAndModify`.
- If Cohorts plugin is enabled and targeting changed:
  - updates existing cohort,
  - or deletes cohort,
  - or creates new cohort and links `cohortID`.
- Emits `cohort_edited` system log when cohort update branch runs.

### Impact on Other Data

- Updates one widget in `countly.feedback_widgets`.
- May update/create/delete related cohort documents in `countly.cohorts`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.feedback_widgets` | Widget storage | Reads and updates target widget document. |
| `countly.cohorts` | Targeting cohorts | May update/create/delete cohort records (when cohorts plugin enabled). |
| `countly.systemlogs` | Audit trail | Receives `cohort_edited` in cohort-update branch. |

## Examples

### Edit widget status and text

```plaintext
/i/feedback/widgets/edit?
  api_key=YOUR_API_KEY&
  widget_id=67a3d2f5c1a23b0f4d6c0201&
  app_id=6991c75b024cb89cdc04efd2&
  status=true&
  popup_header_text=How was your experience?&
  target_pages=["/","/pricing"]
```

## Related Endpoints

- [Star Rating - Toggle Widget Status](i-feedback-widgets-status.md)
- [Star Rating - List All Widgets](o-feedback-widgets.md)

## Last Updated

2026-03-07
