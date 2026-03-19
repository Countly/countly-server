---
sidebar_label: "Read Dashboard"
---

# /o/push/dashboard

## Endpoint

```plaintext
/o/push/dashboard
```

Ⓔ Enterprise Only

## Overview

Returns aggregated push performance metrics (sent and action), split by regular, automated, and API-triggered traffic, with platform breakdowns and enabled-user counts.

---

## Authentication

This endpoint requires authentication and uses `read-permission validation`.

Supported authentication methods:
- Query parameter: `api_key`
- Query parameter: `auth_token`
- Header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `Read` permission for Push Notifications.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes* | API key authentication |
| `auth_token` | String | Yes* | Session token authentication |
| `app_id` | ObjectID | Yes | App ID |

`*` Provide either `api_key` or `auth_token`.

## Response

### Success Response

```json
{
  "sent": {
    "total": 5210,
    "weekly": {"keys": ["W43", "W44"], "data": [420, 515]},
    "monthly": {"keys": ["2025 Nov", "2025 Dec"], "data": [2100, 3110]},
    "platforms": {
      "i": {"total": 3020, "weekly": {"keys": ["W43", "W44"], "data": [250, 300]}, "monthly": {"keys": ["2025 Nov", "2025 Dec"], "data": [1200, 1820]}},
      "a": {"total": 2190, "weekly": {"keys": ["W43", "W44"], "data": [170, 215]}, "monthly": {"keys": ["2025 Nov", "2025 Dec"], "data": [900, 1290]}}
    }
  },
  "sent_automated": {
    "total": 940,
    "daily": {"keys": [0, 1, 2], "data": [15, 31, 20]},
    "platforms": {
      "i": {"total": 500, "daily": {"keys": [0, 1, 2], "data": [8, 17, 10]}},
      "a": {"total": 440, "daily": {"keys": [0, 1, 2], "data": [7, 14, 10]}}
    }
  },
  "sent_tx": {
    "total": 210,
    "daily": {"keys": [0, 1, 2], "data": [2, 7, 5]},
    "platforms": {
      "i": {"total": 130, "daily": {"keys": [0, 1, 2], "data": [1, 4, 3]}},
      "a": {"total": 80, "daily": {"keys": [0, 1, 2], "data": [1, 3, 2]}}
    }
  },
  "actions": {
    "total": 880,
    "weekly": {"keys": ["W43", "W44"], "data": [75, 90]},
    "monthly": {"keys": ["2025 Nov", "2025 Dec"], "data": [360, 520]},
    "platforms": {
      "i": {"total": 510, "weekly": {"keys": ["W43", "W44"], "data": [45, 50]}, "monthly": {"keys": ["2025 Nov", "2025 Dec"], "data": [210, 300]}},
      "a": {"total": 370, "weekly": {"keys": ["W43", "W44"], "data": [30, 40]}, "monthly": {"keys": ["2025 Nov", "2025 Dec"], "data": [150, 220]}}
    }
  },
  "actions_automated": {
    "total": 220,
    "daily": {"keys": [0, 1, 2], "data": [4, 9, 6]},
    "platforms": {
      "i": {"total": 125, "daily": {"keys": [0, 1, 2], "data": [2, 5, 3]}},
      "a": {"total": 95, "daily": {"keys": [0, 1, 2], "data": [2, 4, 3]}}
    }
  },
  "actions_tx": {
    "total": 60,
    "daily": {"keys": [0, 1, 2], "data": [1, 3, 1]},
    "platforms": {
      "i": {"total": 36, "daily": {"keys": [0, 1, 2], "data": [1, 2, 1]}},
      "a": {"total": 24, "daily": {"keys": [0, 1, 2], "data": [0, 1, 0]}}
    }
  },
  "enabled": {"total": 10230, "i": 6300, "a": 3930},
  "users": 14052,
  "platforms": {"i": "iOS", "a": "Android", "w": "Web"},
  "tokens": {"tkap": "FCM Token", "tkip": "APN Production Token", "tkid": "APN Development Token"},
  "legacyFcm": false
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `sent` | Object | Aggregated sent metrics (weekly/monthly/total + platform breakdown) |
| `sent_automated` | Object | Last-30-days automated sent metrics |
| `sent_tx` | Object | Last-30-days API-triggered sent metrics |
| `actions` | Object | Aggregated action metrics |
| `actions_automated` | Object | Last-30-days automated action metrics |
| `actions_tx` | Object | Last-30-days API-triggered action metrics |
| `enabled` | Object | Push-enabled user counts by platform |
| `users` | Number | Total user count from `app_users{appId}` |
| `platforms` | Object | Platform code to display-name map |
| `tokens` | Object | Token field to display-name map |
| `legacyFcm` | Boolean | `true` when legacy FCM credentials are detected |

### Error Responses

`400 Bad Request`

```json
{
  "result": {
    "errors": ["app_id is required"]
  }
}
```

`500 Internal Server Error`

```json
{
  "result": "Error: Failed to build dashboard metrics"
}
```

---

## Behavior/Processing

1. Validates `app_id` as ObjectID.
2. Builds event queries for `[CLY]_push_sent` and `[CLY]_push_action` over the last 13 months window.
3. Counts enabled users by platform token fields in `app_users{appId}`.
4. Aggregates event documents into monthly/weekly totals and 30-day automated/API daily series.
5. Merges Huawei into Android in output, removes test platform keys from output maps.
6. Adds `legacyFcm` flag from `countly.creds`.

### Impact on Other Data

This endpoint is read-only and does not modify data.

## Database Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| `countly.events_data` | Event aggregates for push sent/action metrics | `_id`, `e`, `s`, `d` |
| `countly.app_users{appId}` | Token presence and total users for enabled/user counters | token fields (`tk*`) |
| `countly.creds` | Detects legacy FCM credential mode | `type`, `key`, `serviceAccountFile` |

---

## Examples

### Read dashboard metrics

```plaintext
https://your-server.com/o/push/dashboard
  ?api_key=YOUR_API_KEY
  &app_id=6991c75b024cb89cdc04efd2
```

## Limitations

- Daily charts for automated/API groups are fixed to last 30 days.
- Weekly/monthly totals are computed from event aggregates, not live raw events.

---

## Related Endpoints

- [Push Notifications - Message List](./message-all.md)
- [Push Notifications - Message Get](./message-get.md)
- [Push Notifications - User History](./user.md)

---

## Last Updated

2026-03-07
