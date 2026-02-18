---
sidebar_label: "Send (Admin)"
---

# /i/reports/send

## Overview

Admin endpoint to manually trigger report sending for a specific report. Similar to the public `/o/reports/send` endpoint but subject to different permission checks. Bypasses normal schedule and delivers immediately to configured recipients.

---

## Endpoint


```plaintext
/i/reports/send
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

This endpoint does not read or write database collections.

## Examples

### Example 1: Manually send admin report

**Description**: Trigger immediate send from admin API

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/send" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"_id":"6262742dbf7392a8bfd8c1f6"}'
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 2: Using GET method

**Description**: Same request using GET (both methods work)

**Request**:
```bash
curl "https://your-server.com/i/reports/send?api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011&args=%7B%22_id%22%3A%226262742dbf7392a8bfd8c1f6%22%7D"
```

**Response** (200):
```json
{"result": "Success"}
```

---

## Behavior/Processing

Same as `/o/reports/send` endpoint. Triggers immediate delivery regardless of schedule settings.

See [Send Report (Public)](./o-reports-send.md) for detailed behavior documentation.

---

## Technical Notes

### Difference from /o/reports/send

**Path**: `/i/reports` (admin) vs `/o/reports` (public)

**Implementation**: Both dispatch through same `sendReport()` function

**Permission**: Both use read permission check

**Access**: Both support non-admin and admin users

---

## Related Endpoints

- [Get All Reports](./o-reports-all.md) - List reports
- [Send Report (Public)](./o-reports-send.md) - Public send endpoint
- [Create Report](./i-reports-create.md) - Create new report

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - report sent | `{"result": "Success"}` |
| `200` | Report not found/access denied | `{"result": "Report not found"}` |
| `200` | No data available | `{"result": "No data to report"}` |
| `400` | Invalid JSON in args | JSON parse error |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **Same behavior as public**: Delegates to same send logic
2. **Immediate delivery**: Ignores schedule settings
3. **Uses report recipients**: Sends to configured emails
4. **PDF attachment**: Based on report sendPdf flag
5. **Feature dispatch**: Non-core reports use feature system
6. **Mail service**: Uses configured email backend
7. **Asynchronous**: Returns immediately, mail sent in background
8. **Error logging**: Failures logged but success still returned
9. **No notification**: Requestor doesn't receive confirmation
10. **Bypass schedule**: Overrides frequency/time settings
11. **Access control**: Non-admins can send own reports
12. **Report config used**: Sends based on saved configuration

## Last Updated

February 2026
