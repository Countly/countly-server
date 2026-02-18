---
sidebar_label: "Alert Status"
---

# Alerts - Update Status

## Endpoint

```text
/i/alert/status
```

## Overview

Bulk updates `enabled` status for one or more alerts.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `alerts` `Update` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | JSON String (Object) | Yes | JSON-stringified map of `alertID -> enabledBoolean`. |
| `app_id` | String | Conditional | Required for non-global-admin users during update validation. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

### `status` Object Structure

Decoded example:

```json
{
  "65f0cbf8bca6b8e8fbf7f901": true,
  "65f0cbf8bca6b8e8fbf7f902": false
}
```

## Response

### Success Response

```json
true
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root value)` | Boolean | `true` after batch update promise resolves. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

- `401`

```json
{
  "result": "No app_id provided"
}
```

- `401`

```json
{
  "result": "User does not exist"
}
```

- `401`

```json
{
  "result": "User does not have right"
}
```

- `500`

```json
{
  "result": "Failed to change alert statusERROR_DETAILS"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Bulk update | Valid `status` JSON map | Builds per-alert updates and applies `enabled` value using `findAndModify` operations. | Raw boolean `true` |
| Parse failure | Invalid JSON in `status` | Stops before DB writes. | Wrapped error message |

### Impact on Other Data

- Invalidates alerts cache so status changes are used by alert processor.
- For non-global-admin users, updates are scoped to alerts with `createdBy=current_user`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and access rights for update validation. |
| `countly.apps` | App validation/context loading | Validates `app_id` for non-global-admin update access. |
| `countly.alerts` | Alert rule persistence | Updates `enabled` field on matching alerts. |

---

## Examples

### Enable and disable alerts in one request

```text
/i/alert/status?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  status={
    "65f0cbf8bca6b8e8fbf7f901":true,
    "65f0cbf8bca6b8e8fbf7f902":false
  }
```

## Limitations

- Endpoint returns `true` even if some IDs do not match any alert (no per-ID status is returned).
- Invalid alert IDs can fail ObjectId conversion during processing.

## Related Endpoints

- [Alerts - Save](i-alert-save.md)
- [Alerts - Delete](i-alert-delete.md)
- [Alerts - List](o-alert-list.md)

## Last Updated

2026-02-17
