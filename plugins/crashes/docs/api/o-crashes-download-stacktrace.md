---
sidebar_label: "Stacktrace Download"
---

# Crashes - Download Stacktrace

## Endpoint

```plaintext
/o/crashes/download_stacktrace
```

## Overview

Downloads plain-text stacktrace for one crash report.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `crashes` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | Target app ID for validation context. |
| `crash_id` | String | Yes | Crash report `_id` in `drill_events`. |

## Response

### Success Response

Binary/text stream download headers:

- `Content-Type: application/octet-stream`
- `Content-Disposition: attachment;filename={crash_id}_stacktrace.txt`

Body contains raw `error` (stacktrace text) from crash report.

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(stream body)` | Text | Raw crash stacktrace text from `error` field in crash report. |
| `Content-Type` | Header | `application/octet-stream` |
| `Content-Disposition` | Header | Attachment filename `{crash_id}_stacktrace.txt`. |

### Error Responses

- `400`

```json
{
  "result": "Please provide crash_id parameter"
}
```

- `400`

```json
{
  "result": "Crash not found"
}
```

- `400`

```json
{
  "result": "Crash does not have stacktrace"
}
```

Standard auth/permission errors from read validation can also be returned.

## Behavior/Processing

- Reads crash report from `countly_drill.drill_events` by `_id`.
- Validates `error` field exists before streaming response.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_drill.drill_events` | Crash report source | Reads crash record by `_id` and streams `error` field. |

## Examples

### Download stacktrace for a crash event

```plaintext
/o/crashes/download_stacktrace?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  crash_id=67a3d2f5c1a23b0f4d6c0001
```

## Last Updated

2026-03-07
