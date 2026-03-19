---
sidebar_label: "Preview HTML"
---

# Reports - Preview HTML

## Endpoint

```plaintext
/i/reports/preview
```

## Overview

Generates report output and returns preview as raw HTML.

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
| `api.offline_mode` | `false` | Report enrichment during report generation | When enabled, external news/universe enrichment is skipped, so preview content can differ from online mode. |

## Response

### Success Response

Raw HTML response with headers:

```text
Content-Type: text/html; charset=utf-8
Access-Control-Allow-Origin: *

<!DOCTYPE html>
<html>...</html>
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(response body)` | String (HTML) | Full rendered report HTML payload. |
| `Content-Type` | Header | `text/html; charset=utf-8` |
| `Access-Control-Allow-Origin` | Header | `*` |

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
  "result": "Error while generating report"
}
```

Standard authentication/authorization errors from read validation can also be returned.

## Behavior/Processing

- Parses `args` JSON before route execution.
- Uses owner-scoped lookup for non-global-admin users.
- Loads the target report and builds report HTML preview data.
- For non-core report types, renders HTML from `res.message.template` and `res.message.data` via EJS.
- Returns raw HTML response body (not wrapped JSON on success).

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Report source | Reads target report definition. |
| `countly.members` | Report generation context | Read indirectly by report generation flow. |
| `countly.event_groups` | Report enrichment | Read indirectly for event-group metadata in generated report content. |

## Examples

### Preview one report as HTML

```plaintext
/i/reports/preview?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  args={"_id":"6262742dbf7392a8bfd8c1f6"}
```

## Limitations

- Successful response is HTML, not JSON.
- Preview generation executes full report query/render logic; large reports can take noticeable time.

## Related Endpoints

- [Reports - Report Send](i-reports-send.md)
- [Reports - Generate PDF](i-reports-pdf.md)

## Last Updated

2026-03-07
