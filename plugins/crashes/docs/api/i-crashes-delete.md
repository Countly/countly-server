---
sidebar_label: "Crash Delete"
---

# Crashes - Delete Crash Groups

## Endpoint

```plaintext
/i/crashes/delete
```

## Overview

Deletes crash groups and their associated crash-user/share/granular records, then updates crash meta counters.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `crashes` `Delete` permission.

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
| `result` | String | `Success` when delete processing completes. |

### Error Responses

- `400`

```json
{
  "result": "Please provide args parameter"
}
```

Standard auth/permission errors from delete validation can also be returned.

## Behavior/Processing

- Loads matched crash groups and iterates each group.
- Emits `crash_deleted` system log action with group payload.
- Removes related drill events for `[CLY]_crash`.
- Removes crash group and related `crash_share` entry.
- Removes matching `app_crashusers{appId}` group rows and updates root group (`group=0`) crash/fatal counters.
- Recomputes `meta.users` and `meta.usersfatal`, applies accumulated counter decrements to `meta`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.app_crashgroups{appId}` | Crash groups and meta | Removes target groups, updates `meta` counters and user totals. |
| `countly.app_crashusers{appId}` | Crash-user aggregates | Removes group-linked rows and updates root-user crash/fatal counters. |
| `countly.crash_share` | Public crash sharing | Removes crash share mapping by hash/app pair. |
| `countly.crashdata` | Legacy crash records | Removes app-scoped crashdata rows on delete path. |
| `countly_drill.drill_events` | Drill crash event rows | Removes matching crash drill rows. |
| `countly.systemlogs` | Audit trail | Receives `crash_deleted` action(s). |

## Examples

```plaintext
/i/crashes/delete?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&args={"crashes":["crash_group_1","crash_group_2"]}
```

## Related Endpoints

- [Crashes - Hide Crash Groups](./i-crashes-hide.md)
- [Crashes - Resolve Crash Groups](./i-crashes-resolve.md)

## Last Updated

2026-03-07
