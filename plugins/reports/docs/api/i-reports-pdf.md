---
sidebar_label: "Generate PDF"
---

# Reports - Generate PDF

## Endpoint

```plaintext
/i/reports/pdf
```

## Overview

Generates report output and returns it as PDF binary.

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
| `api.offline_mode` | `false` | Report enrichment during report generation | When enabled, external news/universe enrichment is skipped, so generated PDF content can differ from online mode. |

## Response

### Success Response

Raw PDF response with headers:

```text
Content-Type: application/pdf
Content-Disposition: inline; filename="report.pdf"
Content-Length: 245678
Access-Control-Allow-Origin: *

%PDF-1.4 ...
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(response body)` | Binary | Generated PDF bytes. |
| `Content-Type` | Header | `application/pdf` |
| `Content-Disposition` | Header | `inline; filename="report.pdf"` |
| `Content-Length` | Header | PDF byte size. |
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

- `500`

```json
{
  "result": "Cannot read pdf file"
}
```

Standard authentication/authorization errors from read validation can also be returned.

## Behavior/Processing

- Parses `args` JSON before route execution.
- Uses owner-scoped lookup for non-global-admin users.
- Loads the target report and builds report HTML payload.
- For non-core report types, renders HTML via EJS before PDF conversion.
- Renders PDF to temporary file `/tmp/email_report_[timestamp].pdf`.
- Reads file content, streams raw PDF response, then unlinks temp file.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Report source | Reads target report definition. |
| `countly.members` | Report generation context | Read indirectly by report generation flow. |
| `countly.event_groups` | Report enrichment | Read indirectly for event-group metadata in generated report content. |

## Examples

### Download generated PDF

```plaintext
/i/reports/pdf?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  args={"_id":"6262742dbf7392a8bfd8c1f6"}
```

## Limitations

- Successful response is binary PDF stream, not JSON.
- PDF generation uses temporary files in `/tmp` and can be slower for large reports.

## Related Endpoints

- [Reports - Preview HTML](i-reports-preview.md)
- [Reports - Report Send](i-reports-send.md)

## Last Updated

2026-03-07
