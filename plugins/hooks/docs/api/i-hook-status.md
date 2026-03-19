---
sidebar_label: "Hook Status"
---

# Hooks - Update Status

## Endpoint

```text
/i/hook/status
```

## Overview

Updates enabled/disabled status for one or more hooks in a single request.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `hooks` `Update` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `status` | JSON String (Object) | Yes | JSON-stringified map of hook IDs to boolean enabled state. |
| `app_id` | String | Conditional | Required for non-global-admin users. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

### `status` Object Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `{hookId}` | Boolean | Yes | Key is hook ObjectID string; value is target enabled state (`true` or `false`). |

Decoded payload example:

```json
{
  "65f0cbf8bca6b8e8fbf7f901": true,
  "65f0cc6ebca6b8e8fbf7f902": false
}
```

## Configuration Impact

`refreshRulesPeriod` controls how quickly the updated enabled state is reflected in runtime rule cache after this endpoint returns.

## Response

### Success Response

```json
true
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root value)` | Boolean | `true` when the batch update promise resolves successfully. |

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

- `400`

```json
{
  "result": "Invalid status list"
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
  "result": "Failed to update hook statuses: MongoServerError: write conflict"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Condition | Result |
|---|---|---|
| Batch status update | Valid `status` map | Updates `enabled` field for each listed hook and returns `true`. |
| JSON parse failure | Invalid or missing `status` JSON string | Returns `400` with `Invalid status list`. |

### Impact on Other Data

- Updates `enabled` values in `countly.hooks`.
- Writes audit event to system logs on successful batch update.

## Audit & System Logs

Successful updates dispatch `/systemlogs` with action:

- `hook_status_updated`

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and access metadata. |
| `countly.apps` | App validation for non-global-admin users | Reads app context during permission validation. |
| `countly.hooks` | Hook status updates | Updates `enabled` field for each hook ID in `status`. |

---

## Examples

### Disable one hook

```text
/i/hook/status?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  status={"65f0cbf8bca6b8e8fbf7f901":false}
```

### Mixed enable/disable batch

```text
/i/hook/status?
  app_id=6991c75b024cb89cdc04efd2&
  api_key=YOUR_API_KEY&
  status={"65f0cbf8bca6b8e8fbf7f901":true,"65f0cc6ebca6b8e8fbf7f902":false}
```

## Operational Considerations

- Large `status` payloads create many parallel DB operations in one request.
- Invalid hook ID strings can fail ObjectID conversion and fail the request.

## Related Endpoints

- [Hooks - Save](i-hook-save.md)
- [Hooks - Read List](o-hook-list.md)

## Last Updated

2026-02-17
