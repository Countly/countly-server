---
sidebar_label: "Crash Unresolve"
---

# Crashes - Unresolve Crash Groups

## Endpoint

```plaintext
/i/crashes/unresolve
```

## Overview

Marks crash groups as unresolved and clears `resolved_version`.

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
| `result` | String | `Success` when unresolve path completes. |

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
- Sets on each matched group:
  - `is_resolved=false`
  - `resolved_version=null`
  - `is_resolving=false`
- Decrements `meta.resolved` for groups that were previously resolved.
- Emits `crash_unresolved` system log action per previously resolved group.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.app_crashgroups{appId}` | Crash status and metadata | Reads target groups, updates status fields, updates `meta` counter document. |
| `countly.systemlogs` | Audit trail | Receives `crash_unresolved` action(s). |

## Examples

```plaintext
/i/crashes/unresolve?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&args={"crash_id":"crash_group_1"}
```

## Related Endpoints

- [Crashes - Resolve Crash Groups](./i-crashes-resolve.md)
- [Crashes - Mark Resolving](./i-crashes-resolving.md)

## Last Updated

2026-03-07
