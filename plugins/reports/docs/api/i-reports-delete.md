---
sidebar_label: "Delete"
---

# /i/reports/delete

## Overview

Permanently deletes a scheduled report. Only the report owner or global admins can delete reports. Deletion is irreversible and removes all report history and scheduling. System logs the deletion for audit purposes.

---

## Endpoint


```plaintext
/i/reports/delete
```

## Authentication

- **Required**: API key with admin/delete permission
- **HTTP Method**: POST recommended
- **Permission**: Delete permission for reports feature

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with delete permissions |
| `app_id` | String | Yes | Primary application ID |
| `args` | String | Yes | JSON with report `_id` |

### args Parameter Format

```json
{
  "_id": "6262742dbf7392a8bfd8c1f6"
}
```

## Response

#### Success Response - Report Deleted
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

- Required: API key with admin/delete permission


## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Reports storage | Stores report definitions, snapshots, or generated artifacts handled by this endpoint. |

## Examples

### Example 1: Delete report

**Description**: Remove report from system

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/delete" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"_id":"6262742dbf7392a8bfd8c1f6"}'
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 2: Delete with GET method

**Description**: Same deletion using GET (both methods work)

**Request**:
```bash
curl "https://your-server.com/i/reports/delete?api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439011&args=%7B%22_id%22%3A%226262742dbf7392a8bfd8c1f6%22%7D"
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 3: Delete non-existent report

**Description**: Attempt to delete report that doesn't exist

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/delete" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"_id":"invalid_id"}'
```

**Response** (200):
```json
{"result": "Report not found"}
```

---

## Behavior/Processing

### Deletion Process

1. **Parse** args JSON string
2. **Extract** report `_id` from args
3. **Validate** required args:
   - `_id` field must exist
   - Must be valid format
4. **Check** ownership:
   - Non-admin: Can only delete own reports
   - Admin: Can delete any report
5. **Load** report document for audit logging
6. **Remove** report from `reports` collection
7. **Log** deletion to system logs
8. **Return** success message

### Access Control

**Non-Admin Users**:
- Query: `{_id: ObjectID, user: current_user_id}`
- Only reports they created can be deleted
- Returns "Report not found" if access denied

**Global Admins**:
- Query: `{_id: ObjectID}`
- Can delete any report
- No ownership check

### Cascading Effects

**What Happens**:
- Report document removed from database
- All scheduling stopped immediately
- No future sends scheduled
- Report no longer appears in lists

**What is Preserved**:
- Email history (not affected)
- System logs (deletion logged)
- User data (not affected)
- App data (not affected)

### Audit Trail

System logs record:
- **Action**: "reports_deleted"
- **Data**: Deleted report document contents
- **User**: API key creator
- **Timestamp**: Deletion time

---

## Technical Notes

### Database Operations

**Delete Operation**:
- **Collection**: `reports`
- **Query**: `{_id: ObjectID(_id), user: current_user_id}` (non-admin)
- **Query**: `{_id: ObjectID(_id)}` (admin)
- **Operation**: Remove document

**Before Delete**:
- Report loaded to capture for audit log
- Validates document exists

**No Rollback**: Without backup restoration, deletion is permanent

### Data Preservation

**Not Deleted**:
- Email send history (separate collection)
- User accounts (if report deleted)
- Application data
- System logs (record the deletion)

**Deletion Impact**:
- Report no longer sent on schedule
- Report unavailable via API
- Report not shown in UI
- History preserved in logs only

### No Cascade

Unlike parameter/condition deletion, reports:
- Don't affect other records
- Don't have dependent documents
- Simple single-document removal
- Isolated deletion

---

## Related Endpoints

- [Get All Reports](./o-reports-all.md) - List all reports
- [Create Report](./i-reports-create.md) - Create new report
- [Update Report](./i-reports-update.md) - Modify report
- [Report Status](./i-reports-status.md) - Enable/disable

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | `{"result": "Success"}` |
| `200` | Report not found/access denied | `{"result": "Report not found"}` |
| `200` | Missing _id argument | `{"result": "Not enough args"}` |
| `400` | Invalid JSON in args | JSON parse error |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **Irreversible operation**: No API restore function available
2. **Access control**: Non-admins can only delete own reports
3. **Soft delete unavailable**: Hard delete only (not soft delete)
4. **Safety check**: Non-existent reports return generic "not found"
5. **No return data**: Only success confirmation returned
6. **Audit logged**: Deletion recorded in system logs
7. **No cascade**: Only deletes the report document
8. **Schedule stops**: Future sends immediately cancelled
9. **No notification**: Report owner not notified of deletion
10. **Email history kept**: Previous sends remain in history
11. **User data unaffected**: Deletion doesn't impact user accounts
12. **Backup recovery**: Only way to recover is database restore

## Last Updated

February 2026
