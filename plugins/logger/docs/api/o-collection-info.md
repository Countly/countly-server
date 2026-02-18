---
sidebar_label: "Collection Info Read"
---

# Logger - Collection Info Read

## Endpoint

```text
/o?method=collection_info
```

## Overview

Returns storage info for the app-specific logger collection: configured cap, current document count, and max value used by logger.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `logger` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `collection_info`. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Conditional | Required for non-global-admin users during read validation. |

## Response

### Success Response

Standard path:

```json
{
  "capped": 1000,
  "count": 126,
  "max": 1000
}
```

Fallback path (when count query fails):

```json
{
  "capped": 1000,
  "count": 1000,
  "max": 1000,
  "status": "error"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `capped` | Number | Logger cap value used by the endpoint. |
| `count` | Number | Current document count in `logs{appId}` (or fallback cap value on error). |
| `max` | Number | Same cap value returned for compatibility. |
| `status` | String | Present only in fallback response; value is `"error"`. |

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
  "result": "App does not exist"
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
  "result": "Token is invalid"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Count success | `countDocuments()` succeeds | Reads count from `logs{appId}` and returns cap/count/max values. | Raw object: `{ "capped": 1000, "count": N, "max": 1000 }` |
| Count fallback | `countDocuments()` throws | Returns fallback object with cap values and `status: "error"`. | Raw object: `{ "capped": 1000, "count": 1000, "max": 1000, "status": "error" }` |

### Impact on Other Data

- Read-only endpoint. It does not modify any collections.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account, lock state, and feature-level app permissions. |
| `countly.apps` | App validation/context loading | Validates `app_id` and loads app context for access checks. |
| `countly.logs{appId}` | Collection usage metrics | Counts documents in the app-specific request-log collection. |

---

## Examples

### Read logger collection usage

```text
/o?
  method=collection_info&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2
```

## Operational Considerations

- This endpoint is lightweight but still performs a live `countDocuments` query on the app log collection.
- If count fails, response still returns `200` with `status: "error"` and fallback numeric values.

## Limitations

- `capped`/`max` values come from server constant (`1000`) used by this endpoint.
- Fallback values are not real counts and should not be used for storage planning.

## Related Endpoints

- [Logger - Logs Read](o-logs.md)

## Last Updated

2026-02-17
