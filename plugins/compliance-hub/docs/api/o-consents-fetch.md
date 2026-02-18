---
sidebar_label: "Consents Read"
---

# Compliance Hub - Consents Read

## Endpoint

```text
/o?method=consents
```

## Overview

Returns consent metric time-series for the selected app and period.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `compliance_hub` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `consents`. |
| `app_id` | String | Conditional | Required for non-global-admin users during read validation. |
| `period` | String | No | Standard Countly period value. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Response

### Success Response

```json
{
  "2026": {
    "2": {
      "17": {
        "0": {
          "p": 12,
          "e": 3
        },
        "1": {
          "p": 9,
          "e": 1
        }
      }
    }
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root object)` | Object | Time-bucketed consent metric object for requested period. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
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
  "result": "User does not have right"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Consent metrics read | `method=consents` | Validates read rights and fetches consent time object via common fetch pipeline. | Raw metrics object |

### Impact on Other Data

- Read-only endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and feature access for read validation. |
| `countly.apps` | App validation/context loading | Validates `app_id` and timezone context when app-scoped validation applies. |
| `countly.consents` | Consent metric source | Reads consent metric documents by app/time period. |

---

## Examples

### Read consent metrics for last 30 days

```text
/o?
  method=consents&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=30days
```

## Related Endpoints

- [Compliance Hub - Consent Current](o-consent-current.md)
- [Compliance Hub - Consent Search](o-consent-search.md)

## Last Updated

2026-02-17
