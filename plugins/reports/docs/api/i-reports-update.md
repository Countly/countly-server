---
sidebar_label: "Update"
---

# /i/reports/update

## Overview

Updates an existing scheduled report configuration. Supports partial updates of schedule, metrics, recipients, and other properties. Only the report owner or global admins can update reports. Changes take effect on next scheduled send.

---

## Endpoint


```plaintext
/i/reports/update
```

## Authentication

- **Required**: API key with admin/update permission
- **HTTP Method**: POST recommended
- **Permission**: Update permission for reports feature

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with update permissions |
| `app_id` | String | Yes | Primary application ID |
| `args` | String | Yes | JSON with report updates (must include `_id`) |

### args Parameter Structure

```json
{
  "_id": "6262742dbf7392a8bfd8c1f6",
  "title": "Updated Report Name",
  "emails": ["new@example.com"],
  "frequency": "weekly",
  "hour": 10,
  "minute": 30
}
```

**Note**: Include only fields you want to update. The `_id` field is required.

## Response

#### Success Response - Report Updated
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

- Required: API key with admin/update permission


## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Reports storage | Stores report definitions, snapshots, or generated artifacts handled by this endpoint. |

## Examples

### Example 1: Update schedule and recipients

**Description**: Change delivery frequency and recipient list

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/update" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"_id":"6262742dbf7392a8bfd8c1f6","frequency":"weekly","day":1,"hour":8,"minute":0,"emails":["monday@company.com","exec@company.com"]}'
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 2: Update included metrics

**Description**: Change which metrics are included in report

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/update" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"_id":"6262742dbf7392a8bfd8c1f6","metrics":{"analytics":false,"crash":true,"custom":true}}'
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 3: Update title and timezone

**Description**: Change report name and timezone for correct scheduling

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/update" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"_id":"6262742dbf7392a8bfd8c1f6","title":"Executive Dashboard Report","timezone":"Europe/Paris"}'
```

**Response** (200):
```json
{"result": "Success"}
```

---

## Behavior/Processing

### Update Process

1. **Parse** args JSON string
2. **Extract** `_id` field from args
3. **Validate** report exists and user has access
4. **Check** ownership:
   - Non-admin: Can only update own reports
   - Admin: Can update any report
5. **Process** update fields:
   - Validate frequency if provided
   - Convert timezone times if timezone changed
   - Parse numeric fields (hour, minute, day)
6. **Exclude** update of certain fields:
   - Remove `_id` from update set (already in query)
   - Don't update `user` field (ownership)
7. **Apply** update with $set operator
8. **Log** changes to system logs
9. **Return** success message

### Field Update Rules

**Updatable Fields**:
- `title`, `emails`, `frequency`, `timezone`
- `day`, `hour`, `minute`
- `metrics`, `selectedEvents`
- `dashboards`, `date_range`
- `sendPdf`, `enabled` (via status endpoint)

**Non-Updatable Fields**:
- `_id` (report identifier)
- `user` (ownership - cannot transfer)
- `report_type` (must delete/recreate to change)
- `apps` (limited ability to change)

**Fields Deleted Before Update**:
- `_id` removed from args before $set operation

### Frequency Normalization

Valid values:
- "daily" - Send every day at specified time
- "weekly" - Send on specified day at specified time
- "monthly" - Send on specified date at specified time
- Auto-defaults to "daily" if invalid

### Timezone Recalculation

When timezone updated:
1. Parse new timezone identifier
2. Recalculate `r_day`, `r_hour`, `r_minute`
3. Store for UI display
4. Scheduler uses recalculated times

### Partial Updates

Only specified fields are modified:
```json
{
  "_id": "6262742dbf7392a8bfd8c1f6",
  "hour": 14
}
```
This updates ONLY the hour, leaving other fields unchanged.

---

## Technical Notes

### Database Operations

**Update Operation**:
- **Collection**: `reports`
- **Query**: `{_id: ObjectID, user: current_user_id}` (non-admin)
- **Query**: `{_id: ObjectID}` (admin)
- **Update**: `{$set: processed_fields}`

**Before Update**:
- Report loaded to check existence
- User matched for audit log

**After Update**:
- System logs written with before/update data
- Before values captured for audit trail

### Audit Trail

System logs include:
- **Action**: "reports_edited"
- **Data**: Before state, before update state
- **User**: API key creator
- **Timestamp**: Update time

### Validation After Update

Selected frequency values recalculated if updated:
- "daily": Day field ignored, hour/minute used
- "weekly": Day 0-6 (Sun-Sat), hour/minute used
- "monthly": Day 1-31, hour/minute used

### Access Control

**Non-Admin Check**:
```javascript
query = {_id: ObjectID, user: current_user_id}
```

Only reports where user owns them can be updated.

---

## Related Endpoints

- [Get All Reports](./o-reports-all.md) - List reports
- [Create Report](./i-reports-create.md) - Create new report
- [Delete Report](./i-reports-delete.md) - Remove report
- [Report Status](./i-reports-status.md) - Enable/disable

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | `{"result": "Success"}` |
| `200` | Report not found/access denied | `{"result": "Report not found"}` |
| `200` | Invalid frequency | Frequency set to "daily" silently |
| `400` | Invalid JSON in args | JSON parse error |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **Partial updates**: Only send fields you want to change
2. **_id required**: Must include report identifier
3. **User cannot change**: Ownership is immutable
4. **Frequency validation**: Silently defaults invalid values
5. **Day field**: Meaning depends on frequency (0-6 for week, 1-31 for month)
6. **Hour/minute**: Always used regardless of frequency
7. **No return data**: Update confirms but doesn't return modified document
8. **Access control**: Non-admins limited to own reports
9. **Timezone handling**: Automatically recalculates if changed
10. **App list**: Validation applied if apps array included
11. **Email list**: Replaces entire list, not merged
12. **Metrics**: Replaces entire metrics object, not merged

## Last Updated

February 2026
