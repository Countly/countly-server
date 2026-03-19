---
sidebar_label: "View Mark"
---

# Crashes - Mark Viewed

## Endpoint

```plaintext
/i/crashes/view
```

## Overview

Marks crash groups as viewed by clearing `is_new` on selected groups and adjusting meta new-counter.

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
| `args.crashes` | Array of Strings | No | Crash group IDs. |
| `args.crash_id` | String | No | Single crash group ID. |

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
| `result` | String | `Success` when at least one crash group is updated. |

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
- For groups with `is_new=true`, sets `is_new=false`.
- Decrements `meta.isnew` according to number of groups changed.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.app_crashgroups{appId}` | Crash status and metadata | Reads selected groups, updates `is_new` flags, updates `meta` counters. |

## Examples

```plaintext
/i/crashes/view?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&args={"crash_id":"crash_group_1"}
```

## Related Endpoints

- [Crashes - Resolve Crash Groups](./i-crashes-resolve.md)
- [Crashes - Hide Crash Groups](./i-crashes-hide.md)

## Last Updated

2026-03-07
