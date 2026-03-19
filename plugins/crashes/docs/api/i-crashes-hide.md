---
sidebar_label: "Crash Hide"
---

# Crashes - Hide Crash Groups

## Endpoint

```plaintext
/i/crashes/hide
```

## Overview

Marks one or more crash groups as hidden.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `crashes` `Update` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | Target app ID. |
| `args` | JSON String (Object) | Yes | Action payload. |
| `args.crash_id` | String | No | Single crash group ID. |
| `args.crashes` | Array of Strings | No | List of crash group IDs. |

Provide `args.crashes` or `args.crash_id`.

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
| `result` | String | `Success` when operation completes. |

### Error Responses

- `400`

```json
{
  "result": "Please provide args parameter"
}
```

Standard auth/permission errors from update validation can also be returned.

## Behavior/Processing

- Resolves crash IDs from `args.crashes` or `[args.crash_id]`.
- Updates matching crash groups with `is_hidden=true`.
- Emits one `crash_hidden` system log action per crash ID.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.app_crashgroups{appId}` | Crash group visibility | Updates `is_hidden=true` for selected groups. |
| `countly.systemlogs` | Audit trail | Receives `crash_hidden` action(s). |

## Examples

```plaintext
/i/crashes/hide?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&args={"crashes":["crash_group_1","crash_group_2"]}
```

## Related Endpoints

- [Crashes - Show Crash Groups](./i-crashes-show.md)

## Last Updated

2026-03-07
