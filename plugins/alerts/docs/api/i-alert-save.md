---
sidebar_label: "Alert Save"
---

# Alerts - Save

## Endpoint

```text
/i/alert/save
```

## Overview

Creates a new alert or updates an existing alert configuration.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `alerts` `Create` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `alert_config` | JSON String (Object) | Yes | JSON-stringified alert configuration payload. |
| `app_id` | String | Conditional | Required for non-global-admin users during create validation. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

### `alert_config` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | String | No | Existing alert ID. If present, endpoint performs update flow. |
| `alertName` | String | Conditional | Required for create flow (`_id` absent). |
| `alertDataType` | String | Conditional | Required for create flow. |
| `alertDataSubType` | String | Conditional | Required for create flow. |
| `selectedApps` | Array | Conditional | Required for create flow; must contain at least one app ID. |
| `enabled` | Boolean | No | Alert enabled state. |
| `alertValues` | Array | No | Alert recipients/values for module-specific processing. |
| `allGroups` | Array | No | Group-based targeting for recipients (module-specific). |
| `compareType` | String | No | Comparison mode (module-specific). |
| `compareValue` | String or Number | No | Threshold/comparison value (module-specific). |

Decoded create example:

```json
{
  "alertName": "Crash Spike",
  "alertDataType": "crashes",
  "alertDataSubType": "critical",
  "selectedApps": ["6991c75b024cb89cdc04efd2"],
  "enabled": true
}
```

Decoded update example:

```json
{
  "_id": "65f0cbf8bca6b8e8fbf7f901",
  "enabled": false,
  "compareValue": 30
}
```

## Response

### Success Response

Create flow:

```json
"65f0cbf8bca6b8e8fbf7f901"
```

Update flow:

```json
{
  "_id": "65f0cbf8bca6b8e8fbf7f901",
  "alertName": "Crash Spike",
  "enabled": true
}
```

Validation-failure branch:

```json
{
  "result": "Not enough args"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root value)` | String | Created alert ID (create flow). |
| `_id` | String | Existing alert ID (update flow return payload). |
| `result` | String | Wrapped message value for validation/error branches. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

- `400`

```json
{
  "result": "Missing alert_config"
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
  "result": "Failed to save an alert"
}
```

- `500`

```json
{
  "result": "Failed to create an alertMongoServerError: duplicate key error"
}
```

- `500`

```json
{
  "result": "Failed to create an alert"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Create alert | `alert_config._id` is absent | Validates required create fields, sets `createdAt` and `createdBy`, inserts alert. | Raw root alert ID |
| Update alert | `alert_config._id` present | Removes `_id` from payload, sets `createdBy` to current member, updates matched alert. | Raw previous alert document or `null` |
| Validation fail | Required create fields missing | Stops before DB write. | Wrapped `{ "result": "Not enough args" }` |

### Impact on Other Data

- Updates alert cache invalidation state so alert processor picks up create/update changes.
- In update flow, `createdBy` is overwritten with the current member ID.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and access rights for create validation. |
| `countly.apps` | App validation/context loading | Validates `app_id` for non-global-admin create access. |
| `countly.alerts` | Alert rule persistence | Inserts new alert documents or updates existing alert documents. |

---

## Examples

### Create alert

```text
/i/alert/save?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  alert_config={
    "alertName":"Crash Spike",
    "alertDataType":"crashes",
    "alertDataSubType":"critical",
    "selectedApps":["6991c75b024cb89cdc04efd2"],
    "enabled":true
  }
```

### Update alert

```text
/i/alert/save?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  alert_config={
    "_id":"65f0cbf8bca6b8e8fbf7f901",
    "enabled":false,
    "compareValue":25
  }
```

## Limitations

- Update flow permission is still `Create` (not `Update`) because the handler is guarded by `create-permission validation`.
- Invalid update ID values can fail during ObjectId conversion and return a generic create/save error.

## Related Endpoints

- [Alerts - Delete](i-alert-delete.md)
- [Alerts - Update Status](i-alert-status.md)
- [Alerts - List](o-alert-list.md)

## Last Updated

2026-02-17
