---
sidebar_label: "SDK Metrics Read"
---

# SDK - SDK Metrics Read

## Endpoint

```plaintext
/o?method=sdks
```

## Overview

Returns SDK metrics time-object data.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `sdk` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `sdks`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | App id. |
| `period` | String | No | Countly period parameter. |
| `timezone` | String | No | Timezone used for period parsing. |
| `action` | String | No | Optional `refresh` mode support from shared fetch pipeline. |

## Response

### Success Response

```json
{
  "2026": {
    "3": {
      "7": {
        "sdks": {
          "[countly-sdk-ios]_24.3.0": {
            "t": 12,
            "u": 10,
            "n": 2
          }
        }
      }
    }
  },
  "meta": {
    "sdks": [
      "[countly-sdk-ios]_24.3.0"
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | SDK metrics time object. |
| `meta.sdks` | Array | SDK segment keys present in response. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Standard metrics read | `method=sdks` and valid access | Reads SDK metric time object from `sdks` collection for requested app/period. | Raw time-object with `meta`. |
| Refresh read | `action=refresh` | Uses shared refresh flow from metrics fetch pipeline. | Raw time-object (refresh-oriented slice). |
| Access failure | Missing auth or missing read rights | Stops before metrics fetch. | Wrapped error in `result`. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.sdks` | SDK metrics source | Reads SDK metrics by app and time period. |

---

## Examples

### Read SDK metrics for 30 days

```plaintext
/o?method=sdks&api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&period=30days
```

## Related Endpoints

- [SDK - SDK Config Read](o-sdk-config.md)

## Last Updated

2026-03-05
