---
sidebar_label: "Logs Read"
---

# Logger - Logs Read

## Endpoint

```text
/o?method=logs
```

## Overview

Returns request-log entries for one app from the logger capped collection, plus current logger state for that app.

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
| `method` | String | Yes | Must be `logs`. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Conditional | Required for non-global-admin users during read validation. |
| `filter` | JSON String (Object) | No | MongoDB query object applied to `logs{appId}`. Invalid JSON is ignored and treated as empty filter. Example: `{"m":"POST","b":true}` |

## Parameter Semantics

| Field | Expected values | Behavior |
|---|---|---|
| `filter` | JSON object encoded as string | Parsed with `JSON.parse`. If parsing fails, endpoint silently falls back to `{}` and returns unfiltered logs. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `logger.state` | `automatic` | Response fields | Returned as `state` in successful responses (`on`, `off`, `automatic`). |

## Response

### Success Response

```json
{
  "logs": [
    {
      "_id": "65f5e4a2e1de3a5f8d1419d9",
      "ts": 1739968875321,
      "reqts": 1739968875316,
      "d": {
        "id": "user-device-001",
        "d": "iPhone",
        "p": "iOS",
        "pv": "17.2"
      },
      "l": {
        "cc": "US",
        "cty": "San Francisco"
      },
      "v": "24.3.0",
      "t": {
        "session": {
          "begin_session": 1
        },
        "metrics": "{\"_app_version\":\"24.3.0\"}"
      },
      "q": "{\"app_key\":\"c959...\",\"device_id\":\"user-device-001\",\"begin_session\":1}",
      "s": {
        "version": "24.3.0",
        "name": "countly-sdk-ios"
      },
      "h": {
        "user-agent": "Countly SDK",
        "countly-token": "",
        "cookie": ""
      },
      "m": "POST",
      "b": false,
      "c": false,
      "res": "{\"body\":{\"result\":\"Success\"}}",
      "p": false
    }
  ],
  "state": "automatic"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `logs` | Array | Up to 1000 matching request-log entries for the app. |
| `logs[]._id` | String | MongoDB document ID for the log entry. |
| `logs[].ts` | Number | Request timestamp (ms). |
| `logs[].reqts` | Number | Request-received timestamp (ms). |
| `logs[].d` | Object | Device details resolved for the request. |
| `logs[].l` | Object | Location details resolved for the request. |
| `logs[].t` | Object | Parsed request-type buckets (session/events/metrics/etc.). |
| `logs[].q` | String | Original request query payload as serialized JSON. |
| `logs[].h` | Object | Request headers with token/cookie sanitized to empty strings. |
| `logs[].m` | String | HTTP method used in request (`GET`, `POST`, ...). |
| `logs[].b` | Boolean | `true` when request was processed as bulk. |
| `logs[].c` | Boolean | `true` when request was canceled. |
| `logs[].res` | String | Serialized response payload snapshot, when captured. |
| `logs[].p` | Array or Boolean | Parsing/processing issues array, or `false` when none. |
| `state` | String | Current logger state: `on`, `off`, or `automatic`. |

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
| Filtered read | `filter` provided and JSON parse succeeds | Applies parsed filter in `find(filter)`, limits to 1000 docs. | Raw object: `{ "logs": [...], "state": "..." }` |
| Fallback read | `filter` missing or invalid JSON | Uses empty filter `{}` and returns latest matching logs up to limit. | Raw object: `{ "logs": [...], "state": "..." }` |

### Impact on Other Data

- Read-only endpoint. It does not create, update, or delete documents.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account, lock state, and feature-level app permissions. |
| `countly.apps` | App validation/context loading | Validates `app_id` and loads app context for access checks. |
| `countly.logs{appId}` | Request log retrieval | Reads request-log documents (`ts`, `q`, `h`, `res`, `p`, etc.). |

---

## Examples

### Read latest logs (unfiltered)

```text
/o?
  method=logs&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2
```

### Read only bulk POST requests

```text
/o?
  method=logs&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  filter={"m":"POST","b":true}
```

## Operational Considerations

- Response is hard-limited to 1000 documents per request.
- Invalid `filter` JSON does not fail the request; it broadens the query to unfiltered logs.

## Limitations

- No server-side pagination is applied by this endpoint; only first 1000 matching logs are returned.
- Because storage uses capped collections, older log records are automatically overwritten.

## Related Endpoints

- [Logger - Collection Info Read](o-collection-info.md)

## Last Updated

2026-02-17
