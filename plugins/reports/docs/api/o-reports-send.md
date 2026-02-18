---
sidebar_label: "Send Now"
---

# /o/reports/send

## Overview

Triggers immediate sending of a scheduled report via email. Bypasses the normal schedule and sends the report now, regardless of time-of-day settings. Useful for urgent distribution or testing report content before scheduling.

---

## Endpoint


```plaintext
/o/reports/send
```

## Authentication

- **Required**: API key with read permission
- **HTTP Method**: GET recommended
- **Permission**: Standard read access to reports feature

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with read permissions |
| `app_id` | String | Yes | Application ID (for permission check) |
| `args` | String | Yes | JSON string containing report `_id` |

### args Parameter Format

```json
{
  "_id": "6262742dbf7392a8bfd8c1f6"
}
```

## Response

#### Success Response - Report Sent
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{"result": "Success"}
```

#### Report Not Found
**Status Code**: `200 OK`

**Body**:
```json
{"result": "Report not found"}
```

#### No Data to Report
**Status Code**: `200 OK`

**Body**:
```json
{"result": "No data to report"}
```

---


### Response Fields

| Field | Type | Description |
|---|---|---|
| `*` | Varies | Fields returned by this endpoint. See Success Response example. |


### Error Responses

```json
{
  "result": "Error"
}
```

## Permissions

- Required: API key with read permission


## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Reports storage | Stores report definitions, snapshots, or generated artifacts handled by this endpoint. |

## Examples

### Example 1: Send report immediately

**Description**: Trigger instant delivery of scheduled report

**Request** (GET):
```bash
curl "https://your-server.com/o/reports/send?api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011&args=%7B%22_id%22%3A%226262742dbf7392a8bfd8c1f6%22%7D"
```

**Response** (200):
```json
{"result": "Success"}
```

Note: The `args` parameter is URL-encoded JSON: `{"_id":"6262742dbf7392a8bfd8c1f6"}`

### Example 2: Send with POST method

**Description**: Same request using POST

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o/reports/send" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"_id":"6262742dbf7392a8bfd8c1f6"}'
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 3: Report not found

**Description**: Attempt to send non-existent report

**Request** (GET):
```bash
curl "https://your-server.com/o/reports/send?api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011&args=%7B%22_id%22%3A%22invalid_id%22%7D"
```

**Response** (200):
```json
{"result": "Report not found"}
```

---

## Behavior/Processing

### Send Process

1. **Parse** `args` JSON string
2. **Validate** report exists and user has access
3. **Check** report ownership
   - Non-admin: Can send own reports only
   - Admin: Can send any report
4. **Generate** report content
   - Query data for specified date range
   - Generate HTML from metrics/dashboards
   - Render EJS templates for custom reports
5. **Send emails** to all recipients in `emails` array
6. **Return** success or error message

### Permission Checking

**Non-Admin Users**:
- Can only send reports they created
- Checked via `user` field match
- Returns "Report not found" if not owner

**Global Admins**:
- Can send any report
- No ownership check applied

### Report Generation

Steps executed internally:
1. Load report configuration from database
2. Query data based on `apps`, `date_range`, `metrics`
3. Generate HTML/PDF based on `sendPdf` flag
4. Compose email with attachments
5. Send to all recipients in `emails` array

### Email Delivery

- **Recipients**: Exact list in `emails` field
- **Subject**: Report title used in email subject
- **Attachment**: Optional PDF based on `sendPdf` flag
- **Content-Type**: HTML or text based on template
- **Retry**: Built-in mail service retry logic
- **No notification**: No confirmation sent to requestor

### Data Included

Report sends data for:
- **Apps**: All apps listed in report config
- **Metrics**: Enabled metrics from `metrics` object
- **Events**: Custom events from `selectedEvents` array
- **Dashboards**: Dashboard data if configured
- **Date**: Last 30 days (default) or custom `date_range`

---

## Technical Notes

### Database Operations

**Read Operations**:
- **Collection**: `reports`
- **Query**: `{_id: ObjectID(_id), user: current_user_id OR global_admin}`
- **Operation**: Find single report configuration

**Send Operations**:
- **Email service**: Sends to configured mail server
- **No database write**: Only read operation (query-only)
- **Temporary files**: PDF created in /tmp directory

### Report Type Handling

**Core Reports**:
- Standard metric collection
- SQL-based data aggregation
- Standard HTML template rendering

**Feature Reports**:
- Dispatch to feature for content generation
- Feature returns HTML/data
- EJS template rendering applied
- Feature verification run first

### Error Handling

- **No strict validation**: Returns generic messages
- **Mail failures**: Logged but success returned to API
- **Missing data**: Still sends without metrics (informational)
- **User errors**: Treated as "not found" for security

---

## Related Endpoints

- [Get All Reports](./o-reports-all.md) - List all reports
- [Create Report](./i-reports-create.md) - Create scheduled report
- [Report Preview](./i-reports-preview.md) - HTML preview
- [Report PDF](./i-reports-pdf.md) - PDF download

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - report sent | `{"result": "Success"}` |
| `200` | Report not found/access denied | `{"result": "Report not found"}` |
| `200` | No data available for report | `{"result": "No data to report"}` |
| `400` | Invalid JSON in args | `{"result": 400, "message": "Invalid JSON in args"}` |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **Asynchronous sending**: Mail sent in background, immediate response
2. **Access control**: Non-admins can only send own reports
3. **No validation**: Report config not re-validated
4. **Error messages**: Generic to avoid information leakage
5. **Email list exact**: Uses stored recipient list, no additions
6. **PDF generation**: Based on `sendPdf` flag in report config
7. **Date range**: Uses report's configured range (not current date)
8. **Frequency override**: Ignores schedule, sends immediately
9. **Feature dispatch**: Non-core reports sent through feature system
10. **Email headers**: Standard mail headers with report title
11. **CC/BCC**: Not supported, direct recipient list only
12. **Template rendering**: EJS templates rendered on send, not cached

## Last Updated

February 2026
