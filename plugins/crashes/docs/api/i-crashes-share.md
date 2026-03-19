---
sidebar_label: "Crash Share"
---

# Crashes - Share Crash Group

## Endpoint

```plaintext
/i/crashes/share
```

## Overview

Enables public sharing for a crash group by creating a share record and marking the group as public.

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
| `args.crash_id` | String | Yes | Crash group ID to share. |

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

- Computes share record ID as SHA1 hash of `app_id + crash_id`.
- Inserts a record into `crash_share`.
- Sets `is_public=true` on the crash group document.
- Emits system log action `crash_shared`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.crash_share` | Public share mapping | Inserts share record for app/crash pair. |
| `countly.app_crashgroups{appId}` | Crash group visibility | Updates `is_public=true` for the crash group. |
| `countly.systemlogs` | Audit trail | Receives `crash_shared` action. |

## Examples

```plaintext
/i/crashes/share?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&args={"crash_id":"crash_group_1"}
```

## Related Endpoints

- [Crashes - Unshare Crash Group](./i-crashes-unshare.md)
- [Crashes - Modify Share Data](./i-crashes-modify-share.md)

## Last Updated

2026-03-07
