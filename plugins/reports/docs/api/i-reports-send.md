---
sidebar_label: "Report Send"
---

# Reports - Report Send

## Endpoint

```plaintext
/i/reports/send
```

## Overview

Triggers immediate send for one report.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `reports` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | App ID used by permission validation. |
| `args` | String (JSON Object) | Yes | Must include report `_id`. |
| `args._id` | String | Yes | Target report ID. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.offline_mode` | `false` | Report enrichment during report generation | When enabled, external news/universe enrichment is skipped, so sent report content can differ from online mode. |

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
| `result` | String | Result message from send flow. |

### Error Responses

- `200`

```json
{
  "result": "Not enough args"
}
```

- `200`

```json
{
  "result": "Report not found"
}
```

- `200`

```json
{
  "result": "No data to report"
}
```

- `200`

```json
{
  "result": "Error while sending out report."
}
```

Standard authentication/authorization errors from read validation can also be returned.

## Behavior/Processing

- Parses `args` JSON before route execution.
- Uses owner-scoped lookup for non-global-admin users.
- Loads the target report, generates report payload, and sends email immediately.
- Returns callback error text directly in `result` when send fails.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Report source | Reads target report definition before send execution. |
| `countly.members` | Report generation context | Read indirectly by report generation flow (report owner/global admin fallback). |
| `countly.event_groups` | Report enrichment | Read indirectly for event group naming in generated report content. |

## Examples

### Send a report immediately

```plaintext
/i/reports/send?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  args={"_id":"6262742dbf7392a8bfd8c1f6"}
```

## Related Endpoints

- [Reports - Reports Read](o-reports-all.md)
- [Reports - Preview HTML](i-reports-preview.md)
- [Reports - Generate PDF](i-reports-pdf.md)

## Last Updated

2026-03-07
