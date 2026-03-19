---
sidebar_label: "Alert Delete"
---

# Alerts - Delete

## Endpoint

```text
/i/alert/delete
```

## Overview

Deletes an alert by ID. Non-global-admin users can delete only alerts they created.

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
| `alertID` | String | Yes | Alert ID to remove. |
| `app_id` | String | Conditional | Required for non-global-admin users during update validation. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Response

### Success Response

```json
{
  "result": "Deleted an alert"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Deletion result message. |

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
  "result": "Alert to delete not found. Make sure alert exists and you have rights to delete it."
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
  "result": "Failed to delete an alert"
}
```

- `500`

```json
{
  "result": "Failed to delete an alertMongoServerError: write conflict"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Delete success | Matching alert found and removed | Removes alert document and invalidates alert processor cache. | Wrapped success message |
| Not found / no rights | No matching alert for query | Returns not-found-or-no-rights message. | Wrapped error message |

### Impact on Other Data

- Invalidates alerts cache so removed alert is not processed in future runs.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and access rights for update validation. |
| `countly.apps` | App validation/context loading | Validates `app_id` for non-global-admin update access. |
| `countly.alerts` | Alert rule persistence | Removes matching alert document by `_id` (+ `createdBy` filter for non-admin users). |

---

## Examples

### Delete alert

```text
/i/alert/delete?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  alertID=65f0cbf8bca6b8e8fbf7f901
```

## Limitations

- For non-global-admin users, delete query includes `createdBy=current_user`, so IDs for alerts owned by other users are reported as not found.

## Related Endpoints

- [Alerts - Save](i-alert-save.md)
- [Alerts - Update Status](i-alert-status.md)

## Last Updated

2026-02-17
