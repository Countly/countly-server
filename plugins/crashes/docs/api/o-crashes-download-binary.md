---
sidebar_label: "Binary Download"
---

# /o/crashes/download_binary

## Endpoint

```plaintext
/o/crashes/download_binary
```


## Overview

Download the binary crash dump file (minidump) for a crash report. Returns the binary dump content with appropriate HTTP headers for file download.

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
| `crash_id` | String | Yes | Crash/Report ID to download binary for |

---

## Response

**HTTP Headers**:
### Success Response

```
Content-Type: application/octet-stream
Content-Disposition: attachment;filename=crash_id_bin.dmp
Content-Length: <file_size>
```

**Body**: Binary crash dump file (base64 decoded)

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

### Example 1: Download crash binary dump

**Request**:
```bash
curl -X GET "https://your-server.com/o/crashes/download_binary" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d "crash_id=crash_123" \
  --output crash_123_bin.dmp
```

---

## Processing Details

The endpoint:
1. Validates read permissions
2. Requires `crash_id` parameter
3. Fetches crash document from drill_events
4. Checks if binary_crash_dump exists and is base64 encoded
5. Decodes base64 to binary
6. Sends as downloadable file with .dmp extension
7. Filename: `{crash_id}_bin.dmp`

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `drill_events` | Drill event rows | Stores granular event records queried or updated by this endpoint. |
| `binary_crash_dump` | Crash data domain | Stores crash reports, groups, comments, and crash-related metadata touched by this endpoint. |

---

## Error Handling

| Status | Message | Cause |
|--------|---------|-------|
| 401 | Unauthorized | Insufficient read permissions |
| 400 | Please provide crash_id parameter | crash_id missing |
| 400 | Crash not found | crash_id doesn't exist |
| 400 | Crash does not have binary_dump | binary_crash_dump field is empty |
| 500 | Crash fetching error | Database failure |

---

## Related Endpoints

- [/o/crashes/download_stacktrace](./o-crashes-download-stacktrace.md) - Download stacktrace text file
- [/o?method=reports](./o-reports.md) - Fetch crash report details

## Last Updated

February 2026
