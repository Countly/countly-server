---
sidebar_label: "Density Read"
---

# /o?method=density

## Endpoint

```plaintext
/o?method=density
```

## Overview

Returns density time-series metrics for the selected app and period.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Required permission: `density` `Read`.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | Target app ID. |
| `method` | String | Yes | Must be `density`. |
| `period` | String | No | Countly period (for example `hour`, `7days`, `30days`, `month`, or timestamp range). |
| `timezone` | String | No | Optional timezone override for period handling. |
| `timestamp` | Number | No | Optional timestamp for period anchoring. |
| `action` | String | No | Optional `refresh` action for fetch behavior. |

## Response

### Success Response

```json
{
  "2026": {
    "2": {
      "17": {
        "0": {
          "dnst": 128
        },
        "1": {
          "dnst": 143
        }
      }
    }
  },
  "meta": {
    "density": ["1x", "2x", "3x"]
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root object)` | Object | Time-bucketed density metrics object. |
| `meta` | Object | Density metadata arrays. |

### Error Responses

`400 Bad Request`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

`401 Unauthorized`

```json
{
  "result": "User does not have right"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Density metrics read | `method=density` | Validates read access and fetches density time object for requested period. | Raw density metrics object |

### Impact on Other Data

- Read-only endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member record by `api_key` or `auth_token` to verify read access. |
| `countly.apps` | App context validation | Reads app record for the requested `app_id` during access validation. |
| `countly.density` | Density metric source | Reads density metric documents for requested app and period. |

## Examples

### Read density metrics for last 30 days

```plaintext
/o?
  api_key=YOUR_API_KEY&
  method=density&
  app_id=6991c75b024cb89cdc04efd2&
  period=30days
```

### Read density metrics for custom range

```plaintext
/o?
  api_key=YOUR_API_KEY&
  method=density&
  app_id=6991c75b024cb89cdc04efd2&
  period=[1738368000000,1738972800000]
```

## Related Endpoints

- [Density - Overview](index.md)

## Last Updated

2026-02-17
