---
sidebar_label: "Create"
---

# /i/reports/create

## Overview

Creates a new scheduled report that will be automatically sent via email on a defined schedule. Supports daily, weekly, and monthly frequency with timezone-aware time selection. Can include various metrics, events, and dashboards.

---

## Endpoint


```plaintext
/i/reports/create
```

## Authentication

- **Required**: API key with admin/write permission
- **HTTP Method**: POST recommended
- **Permission**: Create permission for reports feature

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with create permissions |
| `app_id` | String | Yes | Primary application ID |
| `args` | String | Yes | JSON string with report configuration |

### args Parameter Structure

```json
{
  "title": "Monthly Analytics Report",
  "report_type": "core",
  "apps": ["app_id_1", "app_id_2"],
  "emails": ["recipient@example.com"],
  "metrics": {
    "analytics": true,
    "crash": false
  },
  "frequency": "daily|weekly|monthly",
  "timezone": "America/New_York",
  "day": 1,
  "hour": 9,
  "minute": 0,
  "dashboards": null,
  "date_range": null,
  "selectedEvents": [],
  "sendPdf": true
}
```

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `title` | String | Report display name |
| `apps` | Array | At least one app_id |
| `frequency` | String | "daily", "weekly", or "monthly" |

### Optional Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `report_type` | String | "core" | "core" or plugin identifier |
| `emails` | Array | [] | Email recipient list |
| `metrics` | Object | {} | Boolean flags for each metric |
| `timezone` | String | "Etc/GMT" | IANA timezone identifier |
| `day` | Integer | 0 | Day (0-6 for week, 1-31 for month) |
| `hour` | Integer | 0 | Hour 0-23 |
| `minute` | Integer | 0 | Minute 0-59 |
| `dashboards` | Array | null | Dashboard IDs to include |
| `date_range` | String | null | Custom date range |
| `selectedEvents` | Array | [] | Custom event IDs |
| `sendPdf` | Boolean | false | Include PDF attachment |

## Response

#### Success Response - Report Created
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{"result": "Success"}
```

#### Validation Error
**Status Code**: `200 OK`

**Body**:
```json
{"result": "Invalid or missing apps"}
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

- Required: API key with admin/write permission


## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Reports storage | Stores report definitions, snapshots, or generated artifacts handled by this endpoint. |

## Examples

### Example 1: Create daily report

**Description**: Create daily analytics report for single app

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/create" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"title":"Daily Analytics","report_type":"core","apps":["507f1f77bcf86cd799439011"],"emails":["analytics@company.com"],"metrics":{"analytics":true},"frequency":"daily","timezone":"America/New_York","hour":9,"minute":0,"sendPdf":false}'
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 2: Create weekly multi-app report with PDF

**Description**: Weekly report across multiple apps with PDF attachment

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/create" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"title":"Weekly Executive Report","report_type":"core","apps":["507f1f77bcf86cd799439011","610cea5f6229f9e738d30d0a"],"emails":["executive@company.com","finance@company.com"],"metrics":{"analytics":true,"crash":true},"frequency":"weekly","timezone":"Europe/London","day":1,"hour":8,"minute":30,"sendPdf":true}'
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 3: Create monthly report with event selection

**Description**: Monthly report with custom events and specific date range

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/create" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"title":"Monthly Event Report","report_type":"core","apps":["507f1f77bcf86cd799439011"],"emails":["product@company.com"],"metrics":{"analytics":true},"selectedEvents":["event_id_1","event_id_2"],"frequency":"monthly","timezone":"Asia/Tokyo","day":1,"hour":0,"minute":0,"date_range":"last_month","sendPdf":true}'
```

**Response** (200):
```json
{"result": "Success"}
```

---

## Behavior/Processing

### Creation Process

1. **Parse** args JSON string
2. **Validate** required fields (title, apps, frequency)
3. **Normalize** frequency to allowed values (daily/weekly/monthly)
4. **Validate** apps array:
   - Not empty
   - User has access to all apps (non-admin check)
5. **Convert** timezone to UTC-equivalent time
6. **Set** user from API key context
7. **Create** document in `reports` collection
8. **Log** creation to system logs
9. **Return** success message

### Field Processing

**frequency Normalization**:
- Only accepts: "daily", "weekly", "monthly"
- Defaults to "daily" if invalid
- Case-sensitive matching

**Time Fields**:
- Converted from user timezone to UTC
- Stored as UTC-equivalent times
- Used for scheduler backend
- Recalculated on read for UI display

**Timezone Conversion**:
- User specifies timezone (e.g., "America/New_York")
- Time converted to UTC equivalent
- Stored `r_day`, `r_hour`, `r_minute` for display
- All scheduling uses UTC internally

### App Access Validation

**Non-Admin Users**:
- All apps must be accessible to user
- Rejects with "User does not have right..." if not
- Global admin apps check is bypassed

**Global Admins**:
- Can create reports for any application
- No app access validation

---

## Technical Notes

### Database Operations

**Write Operation**:
- **Collection**: `reports`
- **Operation**: Insert new document
- **Document**: Includes auto-set fields

**Auto-Set Fields**:
```javascript
{
  "user": user_id_from_api_key,
  "minute": parseInt(minute),
  "hour": parseInt(hour),
  "day": parseInt(day),
  "timezone": timezone || "Etc/GMT",
  "frequency": normalized_frequency,
  // Plus r_day, r_hour, r_minute (converted times)
}
```

### Timezone Conversion Details

**Input**: User timezone + time (e.g., "America/New_York" + 9:00 AM)
**Process**:
1. Get client offset in that timezone
2. Get server offset (UTC)
3. Calculate difference
4. Store converted time

**Storage**:
- Internal times: UTC-equivalent
- Stored times: r_day, r_hour, r_minute for UI
- Used by scheduler: Internal times

### System Logs

Each report creation triggers:
- **Action**: "reports_create"
- **Data**: Complete report document
- **User**: API key creator
- **Timestamp**: Current system time

### Defaults Applied

- `report_type`: Defaults to "core" if not specified
- `timezone`: Defaults to "Etc/GMT" if not specified
- `frequency`: Defaults to "daily" if invalid
- `minute`: Defaults to 0 if not provided
- `hour`: Defaults to 0 if not provided
- `day`: Defaults to 0 if not provided

---

## Related Endpoints

- [Get All Reports](./o-reports-all.md) - List all reports
- [Update Report](./i-reports-update.md) - Modify report
- [Delete Report](./i-reports-delete.md) - Remove report
- [Report Status](./i-reports-status.md) - Enable/disable

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | `{"result": "Success"}` |
| `200` | Invalid apps array | `{"result": "Invalid or missing apps"}` |
| `200` | User lacks app access | `{"result": "User does not have right..."}` |
| `400` | Invalid JSON in args | JSON parse error message |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **No return ID**: Document ID not returned (query Get All to find it)
2. **Required apps**: At least one app must be specified
3. **Email flexibility**: Can include non-Countly emails
4. **Metric flags**: Boolean object, not array
5. **Event list**: Array of custom event identifiers
6. **PDF background**: Generated during scheduled send, not creation
7. **Frequency validation**: Only 3 valid values
8. **Timezone mandatory**: Set to server default if omitted
9. **User auto-set**: Cannot be overridden in args
10. **Enabled by default**: Reports start in enabled state
11. **No immediate send**: Created reports don't send until schedule
12. **Access control**: Non-admins limited to own apps

## Last Updated

February 2026
