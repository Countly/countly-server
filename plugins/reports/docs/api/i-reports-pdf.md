---
sidebar_label: "Generate PDF"
---

# /i/reports/pdf

## Overview

Generates and downloads a PDF version of a report. Uses the HTML content and converts it to PDF using Puppeteer for browser-quality rendering. Useful for archival, sharing in non-digital format, or manual distribution outside the email schedule.

---

## Endpoint


```plaintext
/i/reports/pdf
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

#### Success Response - PDF File
**Status Code**: `200 OK`

**Headers**:
### Success Response

```
Content-Type: application/pdf
Content-Disposition: inline; filename="report.pdf"
Content-Length: <file size in bytes>
Access-Control-Allow-Origin: *
```

**Body**: Binary PDF file data

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

### Example 1: Download PDF report

**Description**: Generate and save PDF to file

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/pdf" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"_id":"6262742dbf7392a8bfd8c1f6"}' \
  --output monthly_report.pdf
```

**Response** (200):
Binary PDF file saved to `monthly_report.pdf`

### Example 2: Generate PDF with curl to inspect

**Description**: Fetch PDF and check file size

**Request**:
```bash
curl -s -X POST "https://your-server.com/i/reports/pdf" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"_id":"6262742dbf7392a8bfd8c1f6"}' \
  | file -
```

**Response**: Shows PDF file type and size information

---

## Behavior/Processing

### PDF Generation Process

1. **Parse** args JSON and extract `_id`
2. **Look up** report configuration
3. **Check** user access (ownership or admin)
4. **Generate** HTML:
   - Query report data
   - Render templates
   - Apply styling
5. **Convert** HTML to PDF**:
   - Use Puppeteer headless browser
   - Render with page size 1028px wide
   - Set height to 1000px
   - Enable sandbox isolation
6. **Return** PDF file to client
7. **Clean up** temporary files

### Puppeteer Rendering

**Configuration**:
```javascript
{
  "path": "/tmp/email_report_<timestamp>.pdf",
  "width": "1028px",
  "height": "1000px"
}
```

**Arguments**:
- `--no-sandbox`: Disable sandbox (for Linux)
- `--disable-setuid-sandbox`: Chrome security
- `--disable-web-security`: Allow cross-origin requests

### File Lifecycle

1. Create temporary file in `/tmp` directory
2. Render HTML to PDF
3. Read PDF file contents into memory
4. Send to client with proper headers
5. Delete temporary file (with error handling)

### Report Type Handling

**Core Reports**:
- Standard template rendering to HTML
- Puppeteer conversion to PDF

**Feature Reports**:
- Feature generates HTML
- EJS template processing
- Puppeteer conversion

---

## Technical Notes

### Puppeteer Integration

**Library**: Uses `pdf.renderPDF()` utility function

**Process**:
```javascript
pdf.renderPDF(html, callback, options, true)
```

**Output**: Temporary PDF file in /tmp directory

**Cleanup**: Automatic deletion after transmission

### Temporary Files

**Location**: `/tmp/email_report_<timestamp>.pdf`

**Lifecycle**:
1. Created during rendering
2. Read into Buffer
3. Deleted after send

**Error handling**: Logs if cleanup fails, doesn't fail response

### Response Headers

**Content-Type**: `application/pdf`

**Content-Disposition**: `inline; filename="report.pdf"`
- Inline: Open in browser
- Filename: Suggested download name

**Content-Length**: Actual file size in bytes

**CORS**: `Access-Control-Allow-Origin: *` - Cross-origin requests allowed

### Sandbox Behavior

Puppeteer runs with sandbox disabled:
- Allows rendering in containerized environments
- Necessary for production Docker deployments
- Security: Mitigated by input sanitization

---

## Related Endpoints

- [Preview Report](./i-reports-preview.md) - HTML preview
- [Send Report](./i-reports-send.md) - Email delivery
- [Create Report](./i-reports-create.md) - Create new report

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - PDF returned | Binary PDF file |
| `200` | Report not found/access denied | "No data to report" text |
| `200` | No data available | "No data to report" text |
| `500` | Cannot read PDF file | Error message |
| `400` | Invalid JSON in args | JSON parse error |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **Browser rendering**: Uses Puppeteer for HTML to PDF conversion
2. **Temporary files**: Cleaned up automatically after transmission
3. **Error handling**: File deletion errors logged but don't block response
4. **Large reports**: No artificial size limits
5. **Slow generation**: Puppeteer rendering takes a few seconds
6. **Memory usage**: Full report HTML loaded into memory
7. **sandbox disabled**: Required for Docker/container execution
8. **Dynamic content**: Renders static data, no JavaScript execution
9. **Responsive layout**: Formatted for 1028px width
10. **File naming**: Generic "report.pdf" name for all reports
11. **Access control**: Non-admins limited to own reports
12. **No caching**: Fresh PDF generated each request

## Last Updated

February 2026
