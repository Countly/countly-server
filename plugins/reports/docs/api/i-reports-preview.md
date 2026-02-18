---
sidebar_label: "Preview HTML"
---

# /i/reports/preview

## Overview

Generates and returns the HTML preview of a report without sending it via email. Useful for testing report configuration, reviewing content before scheduling, or debugging template issues. Returns raw HTML suitable for browser display.

---

## Endpoint


```plaintext
/i/reports/preview
```

## Authentication

- **Required**: API key with read permission
- **HTTP Method**: POST recommended
- **Permission**: Standard read access to reports feature

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with read permissions |
| `app_id` | String | Yes | Application ID (for access check) |
| `args` | String | Yes | JSON with report `_id` |

### args Parameter Format

```json
{
  "_id": "6262742dbf7392a8bfd8c1f6"
}
```

## Response

#### Success Response - HTML Content
**Status Code**: `200 OK`

**Headers**: `Content-Type: text/html; charset=utf-8`

**Body**: Raw HTML document for report

### Success Response

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Monthly Report</title>
    <style>...</style>
  </head>
  <body>
    <!-- Report content -->
  </body>
</html>
```

#### Report Not Found
**Status Code**: `200 OK`

**Body**: `No data to report`

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

This endpoint does not read or write database collections.

## Examples

### Example 1: Preview report in browser

**Description**: Get HTML preview for testing before scheduling

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/preview" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"_id":"6262742dbf7392a8bfd8c1f6"}' \
  > report.html
  
# Then open in browser
open report.html
```

**Response** (200):
```html
<!DOCTYPE html>
<html>
<head>
  <title>Monthly Analytics Report</title>
  <style>body { font-family: Arial; }</style>
</head>
<body>
  <h1>Monthly Analytics Report</h1>
  <table><!-- metrics data --></table>
</body>
</html>
```

### Example 2: Using curl to inspect HTML

**Description**: Fetch and display preview content

**Request**:
```bash
curl -s -X POST "https://your-server.com/i/reports/preview" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"_id":"6262742dbf7392a8bfd8c1f6"}' | head -50
```

**Response**: First 50 lines of HTML document

---

## Behavior/Processing

### Preview Generation

1. **Parse** args JSON and extract `_id`
2. **Look up** report configuration
3. **Check** user access (ownership or admin)
4. **Query** data** for report:
   - Based on apps in config
   - Applied metrics from config
   - Custom events if selected
   - Date range if specified
5. **Generate** HTML:
   - Use report template
   - Insert fetched data
   - Apply CSS styling
   - Render EJS if feature report
6. **Return** raw HTML to browser

### Report Type Handling

**Core Reports**:
- Built-in templates
- Standard metric rendering
- HTML directly returned

**Feature Reports**:
- Feature generates template and data
- EJS template rendering applied
- Processed through feature dispatch

### Data Included

Same data as scheduled send:
- **Apps**: All apps in report config
- **Metrics**: Enabled metrics from config
- **Events**: Custom events from selectedEvents
- **Date**: Based on date_range or default
- **Dashboards**: If configured

### Browser Display

- **Content-Type**: `text/html; charset=utf-8`
- **No attachment headers**: Displayed inline
- **CORS enabled**: `Access-Control-Allow-Origin: *`
- **Responsive design**: Formatted for various widths

---

## Technical Notes

### Report Generation

**Process**:
1. Load report from `reports` collection
2. Call `reports.getReport()` function
3. Receive HTML content from feature/core engine
4. Render EJS if needed
5. Return raw HTML body

**Rendering**:
- For core: Built-in template engine
- For features: Feature-specific template
- EJS rendering: `ejs.render(template, data)`

### Response Format

**Headers**:
```
Content-Type: text/html; charset=utf-8
Access-Control-Allow-Origin: *
```

**Body**: Unmodified HTML content

**No JSON wrapper**: Raw HTML, not JSON response

### Template Rendering

**EJS Processing**:
```javascript
if (result.report_type !== "core") {
  html = ejs.render(res.message.template, res.message.data);
}
```

Non-core reports rendered through EJS engine.

### Performance Notes

- **No caching**: Generated fresh each request
- **Query execution**: Runs full data query
- **Rendering**: Template rendering on demand
- **File access**: No temporary file creation

---

## Related Endpoints

- [Get Report PDF](./i-reports-pdf.md) - Generate PDF version
- [Send Report](./i-reports-send.md) - Send via email
- [Create Report](./i-reports-create.md) - Create new report

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - HTML returned | Raw HTML document |
| `200` | Report not found/access denied | "No data to report" text |
| `200` | No data available for configuration | "No data to report" text |
| `400` | Invalid JSON in args | JSON parse error |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **No JSON response**: Returns raw HTML, not JSON
2. **Full query run**: Executes data aggregation like scheduled send
3. **Same data source**: Uses report configuration directly
4. **No caching**: Fresh data each request
5. **EJS rendering**: Non-core reports go through template engine
6. **Browser fetch**: CORS enabled for cross-origin requests
7. **Inline display**: Content-Type set for browser rendering
8. **Access control**: Non-admins limited to own reports
9. **Large reports**: No size limit on HTML generation
10. **Debugging tool**: Useful for testing configuration impact
11. **No side effects**: Read-only operation
12. **Performance cost**: Runs full data query like send

## Last Updated

February 2026
