---
sidebar_label: "Enable or Disable"
---

# /i/reports/status

## Overview

Enables or disables one or more reports with a single batch operation. Allows bulk toggling of report scheduling without modifying configuration. Disabled reports skip scheduled sends but remain stored and can be re-enabled.

---

## Endpoint


```plaintext
/i/reports/status
```

## Authentication

- **Required**: API key with update permission
- **HTTP Method**: POST recommended
- **Permission**: Update permission for reports feature

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with update permissions |
| `app_id` | String | Yes | Primary application ID |
| `args` | String | Yes | JSON with report status mapping |

### args Parameter Format

```json
{
  "626270afbf7392a8bfd8c1f3": true,
  "626270afbf7392a8bfd8c1f4": false,
  "626270afbf7392a8bfd8c1f5": true
}
```

Object keys are report `_id` values, values are boolean enable/disable flags.

## Response

#### Success Response - Status Updated
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{"result": "Success"}
```

#### Empty Status List
**Status Code**: `200 OK`

**Body**:
```json
{"result": "Success"}
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

- Required: API key with update permission


## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Reports storage | Stores report definitions, snapshots, or generated artifacts handled by this endpoint. |

## Examples

### Example 1: Enable single report

**Description**: Turn scheduling back on for one report

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/status" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"6262742dbf7392a8bfd8c1f6":true}'
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 2: Disable multiple reports

**Description**: Turn off several reports at once

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/status" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"6262742dbf7392a8bfd8c1f6":false,"626270afbf7392a8bfd8c1f4":false}'
```

**Response** (200):
```json
{"result": "Success"}
```

### Example 3: Mix enable and disable in one request

**Description**: Update status of multiple reports (some on, some off)

**Request**:
```bash
curl -X POST "https://your-server.com/i/reports/status" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439011" \
  -d 'args={"626270afbf7392a8bfd8c1f3":true,"626270afbf7392a8bfd8c1f4":false,"626270afbf7392a8bfd8c1f5":true}'
```

**Response** (200):
```json
{"result": "Success"}
```

---

## Behavior/Processing

### Status Update Process

1. **Parse** args JSON string
2. **Extract** status mapping object
3. **Validate** permission (update access required)
4. **Initialize** bulk operation
5. **For each** report ID in args:
   - Build update filter: `{_id: ObjectID(id)}`
   - Build update: `{$set: {enabled: boolean_value}}`
   - Add to bulk operation
6. **Execute** bulk operation
7. **Return** success or error

### Bulk Operation

Uses MongoDB `initializeUnorderedBulkOp()`:
- **Multiple updates** in single atomic transaction
- **Unordered**: Operations processed in parallel
- **Atomic at item level**: Each update is atomic
- **Fast**: More efficient than individual updates

### Permission Checking

Only users with update permission can change status:
- Requires `validateUpdate()` check
- API key must have update capability
- Non-admins limited to own reports (in practice)

### What "Disabled" Means

**Disabled Reports** (`enabled: false`):
- No longer sent on schedule
- Still appear in report lists
- Configuration unchanged
- Still visible in API responses
- Can be toggled back on without reconfiguration

**Enabled Reports** (`enabled: true`):
- Scheduled sends resume/start
- Configuration preserved during disable
- Used by scheduler daemon
- Normal operation

---

## Technical Notes

### Database Operations

**Bulk Update**:
```javascript
var bulk = collection("reports").initializeUnorderedBulkOp();
for (const id in statusList) {
  bulk.find({_id: ObjectID(id)})
      .updateOne({$set: {enabled: statusList[id]}});
}
bulk.execute(callback);
```

**Transaction Type**: Unordered bulk write operation

**Atomic Scope**: Individual update operations are atomic

### Status Field

**Field name**: `enabled`

**Type**: Boolean

**Default**: true (reports enabled by default)

**Usage**: Checked by scheduler before sending

### Bulk Operation Benefits

- **Multiple updates**: Handle 100+ reports in one call
- **Atomic updates**: Each update guaranteed
- **Performance**: Batched network round-trip
- **Unordered**: Parallel processing allowed

### Error Handling

**If bulk fails**:
- Returns error to client
- Some updates may have committed (unordered)
- No rollback mechanism
- Recommend re-check status

**If empty list**:
- Bulk operation completes without error
- Returns success (nothing to do)

---

## Related Endpoints

- [Get All Reports](./o-reports-all.md) - List all reports
- [Create Report](./i-reports-create.md) - Create new report
- [Update Report](./i-reports-update.md) - Modify report
- [Delete Report](./i-reports-delete.md) - Remove report

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | `{"result": "Success"}` |
| `200` | Empty status list | `{"result": "Success"}` |
| `200` | Bulk operation error | Error message from MongoDB |
| `400` | Invalid JSON in args | JSON parse error |
| `401` | Invalid API key | Authentication error |

---

## Implementation Notes

1. **Bulk operation**: Efficient for multiple updates
2. **Unordered execution**: Operations processed in parallel
3. **Permission required**: Update access needed
4. **No return data**: Only success confirmation
5. **ID string format**: MongoDB ObjectID converted from string
6. **Boolean values**: true/false for enabled/disabled
7. **Disabled persists**: Reports stay disabled until enabled
8. **No config changes**: Only affects enabled flag
9. **Fast operation**: Bulk reduces network overhead
10. **Partial failure possible**: In unordered mode
11. **Re-enable easy**: Just send enabled: true again
12. **Safe toggle**: No validation of report existence

## Last Updated

February 2026
