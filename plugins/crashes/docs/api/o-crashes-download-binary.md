---
sidebar_label: "Binary Download"
---

# Crashes - Download Binary Dump

## Endpoint

```plaintext
/o/crashes/download_binary
```

## Overview

Downloads binary minidump for one crash report.

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

Binary stream download headers:

- `Content-Type: application/octet-stream`
- `Content-Disposition: attachment;filename={crash_id}_bin.dmp`

Body contains decoded bytes from `binary_crash_dump` field.

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(stream body)` | Binary | Decoded binary dump bytes from `binary_crash_dump`. |
| `Content-Type` | Header | `application/octet-stream` |
| `Content-Disposition` | Header | Attachment filename `{crash_id}_bin.dmp`. |

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
  "result": "Crash does not have binary_dump"
}
```

Standard auth/permission errors from read validation can also be returned.

## Behavior/Processing

- Reads crash report from `countly_drill.drill_events` by `_id`.
- Decodes base64 `binary_crash_dump` and streams as `.dmp` file.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_drill.drill_events` | Crash report source | Reads crash record by `_id` and streams `binary_crash_dump`. |

## Examples

### Download binary dump for a crash event

```plaintext
/o/crashes/download_binary?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  crash_id=67a3d2f5c1a23b0f4d6c0001
```

## Last Updated

2026-03-07
