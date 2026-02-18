---
sidebar_label: "Get All"
---

# /o/reports/all

## Overview

Retrieves all reports accessible to the authenticated user. Non-admin users see only their own reports, while global admins see all reports in the system. Returns comprehensive report configurations including scheduling and target metrics.

---

## Endpoint


```plaintext
/o/reports/all
```

## Authentication

- **Required**: API key with read permission
- **HTTP Method**: GET recommended (all methods supported)
- **Permission**: Standard read access to reports feature

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with read permissions |
| `app_id` | String | Yes | Application ID (used for permission check) |

## Response

#### Success Response - Reports Array
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
[
  {
    "_id": "6262742dbf7392a8bfd8c1f6",
    "title": "Monthly Analytics Report",
    "report_type": "core",
    "apps": [
      "615f0c4120543a8ed03a89b8",
      "610cea5f6229f9e738d30d0a"
    ],
    "emails": [
      "analytics@company.com",
      "manager@company.com"
    ],
    "metrics": {
      "analytics": true,
      "crash": true
    },
    "metricsArray": [],
    "frequency": "monthly",
    "timezone": "America/New_York",
    "day": 1,
    "hour": 9,
    "minute": 0,
    "dashboards": null,
    "date_range": null,
    "selectedEvents": [],
    "sendPdf": true,
    "user": "60afbaa84723f369db477fee",
    "r_day": 1,
    "r_hour": 13,
    "r_minute": 0,
    "isValid": true,
    "enabled": true
  }
]
```

#### Empty Reports
**Status Code**: `200 OK`

**Body**:
```json
[]
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

### Example 1: Get all reports for current user

**Description**: Retrieve all reports accessible to authenticated user

**Request** (GET):
```bash
curl "https://your-server.com/o/reports/all?api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
[
  {
    "_id": "6262742dbf7392a8bfd8c1f6",
    "title": "Monthly Analytics Report",
    "report_type": "core",
    "apps": ["615f0c4120543a8ed03a89b8"],
    "emails": ["analytics@company.com"],
    "metrics": {
      "analytics": true,
      "crash": true
    },
    "frequency": "monthly",
    "timezone": "America/New_York",
    "day": 1,
    "hour": 9,
    "minute": 0,
    "sendPdf": true,
    "user": "60afbaa84723f369db477fee",
    "isValid": true,
    "enabled": true
  }
]
```

### Example 2: Get reports for global admin (sees all)

**Description**: Admin user retrieves all reports in system

**Request** (GET):
```bash
curl "https://your-server.com/o/reports/all?api_key=ADMIN_API_KEY&app_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
[
  {
    "_id": "6262742dbf7392a8bfd8c1f6",
    "title": "Monthly Analytics Report",
    "report_type": "core",
    "apps": ["615f0c4120543a8ed03a89b8"],
    "emails": ["user1@company.com"],
    "frequency": "monthly",
    "user": "60afbaa84723f369db477fee",
    "isValid": true
  },
  {
    "_id": "626270afbf7392a8bfd8c1f4",
    "title": "Weekly Crash Report",
    "report_type": "core",
    "apps": ["610cea5f6229f9e738d30d0a"],
    "emails": ["user2@company.com"],
    "frequency": "weekly",
    "user": "60afbaa84723f369db477faa",
    "isValid": true
  }
]
```

### Example 3: No reports exist

**Description**: Request returns empty array when no reports available

**Request** (GET):
```bash
curl "https://your-server.com/o/reports/all?api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
[]
```

---

## Behavior/Processing

### Access Control

**Non-Admin Users**:
- Query filter: `{user: user_id}` OR `{emails: user_email}`
- See own reports and reports where they're email recipients
- Cannot see other users' reports (even if shared via email)

**Global Admins**:
- No query filter
- See all reports in system
- Can manage any report

### Report Validation

For each report returned:
1. **Core reports**: Mark as `isValid: true`
2. **Feature reports**: Dispatch to feature for validation
3. **Invalid reports**: Mark as `isValid: false` (but still returned)
4. Features can verify report still targets active/valid configurations

### Timezone Conversion

Response includes:
- `r_day`: Report day recalculated to user timezone
- `r_hour`: Report hour recalculated to user timezone
- `r_minute`: Report minute recalculated to user timezone
- Helps UI display correct schedule time

---

## Technical Notes

### Database Operations

**Read Operation**:
- **Collection**: `reports`
- **Query**: Depends on user permission level
  - Non-admin: `{user: ObjectID, OR emails: email}`
  - Admin: `{}`
- **No filters**: Returns deleted reports too

**Find Options**:
- No pagination
- No sorting applied
- Full documents returned

### Report Data

Core fields always present:
- `_id`: MongoDB ObjectId
- `title`: User-provided name
- `report_type`: "core" or feature identifier
- `user`: Creator user ID
- `emails`: Recipient array
- `enabled`: Scheduling enabled flag

Optional fields:
- `dashboards`: Null unless dashboard-based
- `date_range`: Custom date range if set
- `selectedEvents`: Custom events array
- `previousReports`: Only on update

### Performance Considerations

- **Load all reports**: No limit or pagination
- **Recommended**: Keep `<100` reports per system
- **Large systems**: Consider implementing pagination
- **Cache**: Safe to cache results (static metadata)

---

## Related Endpoints

- [Send Report](./o-reports-send.md) - Trigger report delivery
- [Create Report](./i-reports-create.md) - Create new report
- [Update Report](./i-reports-update.md) - Modify report
- [Delete Report](./i-reports-delete.md) - Remove report
- [Report Status](./i-reports-status.md) - Enable/disable reports

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - reports array returned | JSON array of report objects |
| `200` | Success - no reports found | Empty JSON array `[]` |
| `400` | Missing app_id parameter | Error message |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **Permission check**: app_id used only for read permission validation
2. **Email recipients**: Users see reports where their email is in recipients list
3. **Admin privilege**: Global admins see all reports regardless of ownership
4. **Report validation**: Core reports always valid, features can invalidate
5. **Timezone offset**: Recalculated times help UI show correct schedule
6. **Enabled flag**: Returned even for disabled reports (don't filter out)
7. **No sorting**: Results returned in database insertion order
8. **No pagination**: All reports returned in single response
9. **Large datasets**: System designed for `<100` active reports
10. **Feature verification**: Called for each non-core report asynchronously
11. **Read-only operation**: No side effects, safe to call repeatedly
12. **Real-time data**: Returns current report state from database

## Last Updated

February 2026
