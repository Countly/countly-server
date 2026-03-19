---
sidebar_label: "Crash Resolve"
---

# Crashes - Resolve Crash Groups

## Endpoint

```plaintext
/i/crashes/resolve
```

## Overview

Marks crash groups as resolved and records resolved version from each group's `latest_version`.

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
  "crash_group_1": "1.2.3",
  "crash_group_2": "1.2.4"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Map of crash group ID to `latest_version` captured from each matched group. |

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
- For groups not already resolved, sets:
  - `is_resolved=true`
  - `resolved_version=latest_version`
  - `is_renewed=false`
  - `is_new=false`
  - `is_resolving=false`
- Updates `meta` counters (`resolved`, `reoccurred`, `isnew`) when applicable.
- Emits `crash_resolved` system log action per newly resolved group.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.app_crashgroups{appId}` | Crash status and metadata | Reads target groups, updates group status fields, updates `meta` counter document. |
| `countly.systemlogs` | Audit trail | Receives `crash_resolved` action(s). |

## Examples

```plaintext
/i/crashes/resolve?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&args={"crashes":["crash_group_1","crash_group_2"]}
```

## Related Endpoints

- [Crashes - Unresolve Crash Groups](./i-crashes-unresolve.md)
- [Crashes - Mark Resolving](./i-crashes-resolving.md)

## Last Updated

2026-03-07
