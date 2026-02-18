---
sidebar_label: "Stacktrace Download"
---

# /o/crashes/download_stacktrace

## Endpoint

```plaintext
/o/crashes/download_stacktrace
```


## Overview

Download the stack trace file for a crash report as a downloadable text file attachment. Returns the error/stack trace content with appropriate HTTP headers for file download.

---

## Authentication
- **Required Permission**: `Read` (crashes feature)
- **HTTP Method**: GET or POST
- **Content-Type**: application/x-www-form-urlencoded

---


## Permissions

- Required Permission: Read (crashes feature)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `app_id` | String | Yes | Application ID |
| `crash_id` | String | Yes | Crash/Report ID to download stacktrace for |

---

## Response

**HTTP Headers**:
### Success Response

```
Content-Type: application/octet-stream
Content-Disposition: attachment;filename=crash_id_stacktrace.txt
Content-Length: <file_size>
```

**Body**: Plain text stacktrace content

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

## Examples

### Example 1: Download crash stacktrace

**Request**:
```bash
curl -X GET "https://your-server.com/o/crashes/download_stacktrace" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d "crash_id=crash_123" \
  --output crash_123_stacktrace.txt
```

---

## Processing Details

The endpoint:
1. Validates read permissions
2. Requires `crash_id` parameter
3. Fetches crash document from drill_events or crash table
4. Checks if stacktrace (`error` field) exists
5. Sends file with download headers
6. Filename: `{crash_id}_stacktrace.txt`

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `drill_events` | Drill event rows | Stores granular event records queried or updated by this endpoint. |
| `error` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Error Handling

| Status | Message | Cause |
|--------|---------|-------|
| 401 | Unauthorized | Insufficient read permissions |
| 400 | Please provide crash_id parameter | crash_id missing |
| 400 | Crash not found | crash_id doesn't exist |
| 400 | Crash does not have stacktrace | error field is empty |
| 500 | Crash fetching error | Database failure |

---

## Related Endpoints

- [/o/crashes/download_binary](./o-crashes-download-binary.md) - Download binary crash dump
- [/o?method=reports](./o-reports.md) - Fetch crash report details

## Last Updated

February 2026
