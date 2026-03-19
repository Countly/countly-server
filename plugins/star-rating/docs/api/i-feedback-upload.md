---
sidebar_label: "Upload Logo"
---

# Star Rating - Upload Logo

## Endpoint

```plaintext
/i/feedback/upload
```

## Overview

Uploads a star-rating image asset into plugin storage.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `global_plugins` `Update` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `feedback_logo` | File | Conditional | Preferred upload field for feedback logo file. |
| `file` | File | Conditional | Generic fallback upload field (used with `name`). |
| `name` | String | Conditional | Required with `file`; used as output file identifier. |

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
| `result` | String | `Success` when file upload completes. |

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

Standard authentication/authorization errors from update validation can also be returned.

## Behavior/Processing

- Endpoint is disabled when Surveys plugin is enabled (`surveysEnabled` branch returns `false`).
- Accepts either `feedback_logo` or fallback `file` + `name` combination.
- Validates MIME (`image/png`, `image/gif`, `image/jpeg`) and extension (`gif|jpeg|jpg|png`).
- Stores image through Countly FS with overwrite mode.

## Database Collections

This endpoint does not read or write MongoDB collections directly.

## Examples

### Upload logo as `feedback_logo`

```plaintext
/i/feedback/upload?
  api_key=YOUR_API_KEY
```

Multipart form body:

```text
feedback_logo=@/path/to/logo.png
```

## Limitations

- Only image formats/extensions listed above are accepted.
- Endpoint is unavailable when Surveys plugin is active.

## Related Endpoints

- [Star Rating - Set Widget Logo](i-feedback-logo.md)

## Last Updated

2026-03-07
