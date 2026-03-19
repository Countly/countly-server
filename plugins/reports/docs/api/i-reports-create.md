---
sidebar_label: "Report Create"
---

# Reports - Report Create

## Endpoint

```plaintext
/i/reports/create
```

## Overview

Creates a scheduled report definition that can later be sent on schedule or on demand.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `reports` `Create` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | App ID used by permission validation. |
| `args` | String (JSON Object) | Yes | Report definition payload. |
| `args.title` | String | No | Report title shown in UI/email subject generation context. |
| `args.report_type` | String | No | Report type. Defaults to `core` when omitted in report flow. |
| `args.apps` | Array of Strings | Yes | List of app IDs included in report. |
| `args.emails` | Array of Strings | No | Email recipients for scheduled/manual sends. |
| `args.metrics` | Object | No | Metrics configuration used by report generation. |
| `args.frequency` | String | No | Scheduling frequency. Normalized to `daily`, `weekly`, or `monthly`. |
| `args.timezone` | String | No | IANA timezone. Defaults to `Etc/GMT`. |
| `args.day` | Number/String | No | Day value for weekly/monthly schedules. Parsed to integer. |
| `args.hour` | Number/String | No | Hour value. Parsed to integer. |
| `args.minute` | Number/String | No | Minute value. Parsed to integer. |
| `args.sendPdf` | Boolean | No | Whether scheduled sends should include PDF attachment. |

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
| `result` | String | `Success` when insert is completed. |

### Error Responses

- `401`

```json
{
  "result": "User does not have right to access this information"
}
```

- `200`

```json
{
  "result": "database error text"
}
```

Standard authentication/authorization errors from create validation can also be returned.

## Behavior/Processing

- Parses `args` JSON before routing logic.
- Normalizes scheduling fields (`minute`, `hour`, `day`) to integers, default `0`.
- Normalizes frequency:
  - `weekly` stays `weekly`
  - `monthly` stays `monthly`
  - any other value becomes `daily`
- Applies timezone conversion helper (`convertToTimezone`) and stores transformed schedule fields.
- Enforces app-level access for non-global-admin users (`args.apps` must be within user apps).
- Inserts report into `countly.reports` and emits `reports_create` system log action.

### Impact on Other Data

- Creates one report document in `countly.reports`.
- Adds one audit entry in `countly.systemlogs` on success.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Report storage | Inserts new report definition document. |
| `countly.systemlogs` | Audit trail | Receives `reports_create` action payload. |

## Examples

### Create a weekly report

```plaintext
/i/reports/create?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  args={"title":"Weekly Executive Report","apps":["6991c75b024cb89cdc04efd2"],"emails":["analytics@company.com"],"frequency":"weekly","day":1,"hour":9,"minute":0,"timezone":"Europe/London","metrics":{"analytics":true},"sendPdf":true}
```

## Limitations

- `args` must be valid JSON; malformed JSON can fail before clean business error handling.
- Non-global-admin users can only include apps they already have access to.

## Related Endpoints

- [Reports - Report Update](i-reports-update.md)
- [Reports - Report Delete](i-reports-delete.md)
- [Reports - Reports Read](o-reports-all.md)

## Last Updated

2026-03-07
