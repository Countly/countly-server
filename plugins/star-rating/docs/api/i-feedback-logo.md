---
sidebar_label: "Set Widget Logo"
---

# Star Rating - Set Widget Logo

## Endpoint

```plaintext
/i/feedback/logo
```

## Overview

Uploads a logo file and returns generated logo filename for widget configuration.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `star_rating` `Create` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `identifier` | String | Yes | File identifier used as output filename prefix. |
| `logo` | File | No | Image file; if omitted, upload helper still returns success branch. |

## Response

### Success Response

```json
{
  "result": "widget_logo_1.png"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Stored filename (`identifier.ext`) when upload succeeds. |

### Error Responses

- `400`

```json
{
  "result": "Invalid image format. Must be png or jpeg"
}
```

- `400`

```json
{
  "result": "Invalid file extension. Must be .png, .jpg, .gif or .jpeg"
}
```

- `400`

```json
{
  "result": "Failed to upload image"
}
```

Standard authentication/authorization errors from create validation can also be returned.

## Behavior/Processing

- Uses shared file-upload helper with same validation rules as upload endpoint.
- Returns `result` as plain filename string through wrapped `result` response.

## Database Collections

This endpoint does not read or write MongoDB collections directly.

## Examples

### Upload widget logo

```plaintext
/i/feedback/logo?
  api_key=YOUR_API_KEY&
  identifier=widget_logo_1
```

Multipart form body:

```text
logo=@/path/to/logo.png
```

## Related Endpoints

- [Star Rating - Upload Logo](i-feedback-upload.md)
- [Star Rating - Edit Widget](i-feedback-widgets-edit.md)

## Last Updated

2026-03-07
