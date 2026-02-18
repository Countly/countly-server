---
sidebar_label: "Hook Delete"
---

# Hooks - Delete

## Endpoint

```text
/i/hook/delete
```

## Overview

Deletes a hook by ID.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `hooks` `Delete` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `hookID` | String | Yes | Hook ID to delete (MongoDB ObjectID string). |
| `app_id` | String | Conditional | Required for non-global-admin users. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Response

### Success Response

```json
{
  "result": "Deleted an hook"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Success message after delete callback completes without error. |

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
  "result": "Token not valid"
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

- `401`

```json
{
  "result": "User is locked"
}
```

- `401`

```json
{
  "result": "App does not exist"
}
```

- `401`

```json
{
  "result": "Token is invalid"
}
```

- `500`

```json
{
  "result": "Failed to delete an hookERROR_DETAILS"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Condition | Result |
|---|---|---|
| Delete hook | Valid `hookID` and DB remove callback without error | Removes matching hook and returns success message. |
| ObjectID conversion failure | Invalid `hookID` format | Returns `500` with `Failed to delete an hook...`. |

### Impact on Other Data

- Removes matching document from `countly.hooks`.
- Writes delete action to system logs when delete callback succeeds.

## Audit & System Logs

Successful deletes dispatch `/systemlogs` with action:

- `hook_deleted`

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and access metadata. |
| `countly.apps` | App validation for non-global-admin users | Reads app context during permission validation. |
| `countly.hooks` | Hook removal | Deletes matched hook document by `_id`. |

---

## Examples

### Delete a hook

```text
/i/hook/delete?app_id=6991c75b024cb89cdc04efd2&api_key=YOUR_API_KEY&hookID=65f0cbf8bca6b8e8fbf7f901
```

## Limitations

- If MongoDB remove callback returns an error (instead of throwing), current implementation does not send a dedicated error payload in that callback branch.
- Deleting a non-existent ID can still return the same success message.

## Related Endpoints

- [Hooks - Save](i-hook-save.md)
- [Hooks - Update Status](i-hook-status.md)

## Last Updated

2026-02-17
