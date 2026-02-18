---
sidebar_label: "Message Delete"
---

# /i/push/message/remove

## Overview

Delete a push notification campaign by marking it as deleted (soft delete). The message remains in the database for audit trail and consistency, but is no longer visible in UI and cannot be updated or sent. All associated schedules are canceled. Deleted messages cannot be restored through the API.

**Related Endpoints**:
- [Message Create](./message-create.md) - Create new campaign
- [Message Update](./message-update.md) - Update campaign
- [Message Toggle](./message-toggle.md) - Stop automated campaigns (alternative to delete)
- [Message List](./message-all.md) - List campaigns (excludes deleted by default)

---

## Endpoint


```plaintext
/i/push/message/remove
```

## Authentication

- **Required Permission**: Delete access to `push` feature (`validateRemove`)
- **HTTP Methods**: POST recommended (all methods supported)
- **Content-Type**: application/x-www-form-urlencoded or JSON

**HTTP Method Flexibility:**  
All Countly endpoints accept any HTTP method (GET, POST, PUT, DELETE) interchangeably.

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API authentication key |
| `app_id` | String | Yes | Application ID (alias for `app`) |
| `app` | ObjectID | Yes | Application ID (MongoDB ObjectID) |
| `_id` | ObjectID | Yes | Message ID to delete |

## Response

#### Success Response - Message Deleted
**Status Code**: `200 OK`

**Body**: Empty object

### Success Response

```json
{}
```

#### Error Response - Validation Error
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "errors": [
    "_id is required"
  ]
}
```

#### Error Response - Message Not Found
**Status Code**: `404 Not Found`

**Body**:
```json
{
  "errors": [
    "Message not found"
  ]
}
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

- Required Permission: Delete access to push feature (validateRemove)

## Behavior/Processing

### Operation Flow

1. **Validation**
   - Validates `_id` parameter (ObjectID format)
   - Returns 400 if validation fails

2. **Message Retrieval**
   - Queries `messages` collection for message with `_id`
   - Stores original message for audit logging
   - Continues even if message not found (idempotent operation)

3. **Message Deletion** (Soft Delete)
   - Updates message in `messages` collection:
     - Sets `status = "deleted"`
     - Sets `info.removed = new Date()`
     - Sets `info.removedBy = member._id`
     - Sets `info.removedByName = member.full_name`
   - Message remains in database (not physically deleted)

4. **Schedule Cancelation**
   - Queries `message_schedules` collection for all schedules with `messageId = _id`
   - Updates all matching schedules:
     - Sets `status = "canceled"`
   - Prevents future automated sends

5. **System Logging**
   - Dispatches `/systemlogs` event:
     - Action: `push_message_deleted`
     - Data: Original message object (before deletion)
   - Creates audit trail entry

6. **Response**
   - Returns empty object `{}`
   - 200 status code indicates success

### Soft Delete vs Hard Delete

**Soft Delete** (Current Implementation):
- ✅ Message marked as `status: "deleted"`
- ✅ Remains in database for audit trail
- ✅ Cannot be restored via API
- ✅ Not visible in UI
- ✅ Cannot be updated or sent
- ✅ Included in database backups
- ℹ️ Use for production environments

**Hard Delete** (Not Implemented):
- ❌ Message physically removed from database
- ❌ No audit trail
- ❌ Cannot be recovered
- ⚠️ Not recommended for production

### Schedule Cancelation

When a message is deleted, all associated schedules are canceled:

**Schedule Types Affected**:
- **Plain triggers**: Scheduled send times canceled
- **Event triggers**: Event listeners remain but won't send
- **Cohort triggers**: Cohort listeners remain but won't send
- **API triggers**: API sends will fail (message marked deleted)
- **Recurring triggers**: All future occurrences canceled

**Schedule Status**:
- Original status: `"scheduled"`, `"pending"`, `"active"`, etc.
- After deletion: `"canceled"`
- Query: `db.message_schedules.updateMany({messageId: _id}, {$set: {status: "canceled"}})`

### Idempotent Operation

Deleting an already-deleted message succeeds silently:
- No error returned
- Schedules already canceled remain canceled
- System log not created (no change occurred)
- Returns `{}` (success)

### Cannot Be Restored

Once deleted, messages cannot be restored through API:
- ❌ No restore endpoint exists
- ❌ Update endpoint rejects deleted messages
- 🔧 Manual database edit required (not recommended)
- 💡 Alternative: Create new campaign from [Message Create](./message-create.md)

---

## Examples

### Example 1: Delete scheduled campaign

**Description**: Delete campaign before it sends

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/remove" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{}
```

### Example 2: Delete draft campaign

**Description**: Remove draft campaign that was never activated

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/remove" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011"
  }'
```

**Response** (200):
```json
{}
```

### Example 3: Delete automated campaign

**Description**: Delete event-triggered campaign (cancels all future sends)

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/remove" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{}
```

**Note**: For temporary stopping of automated campaigns, consider [Message Toggle](./message-toggle.md) instead, which allows restarting later.

### Example 4: Delete API-triggered campaign

**Description**: Remove API-triggered campaign

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/remove" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{}
```

### Example 5: Delete using GET method

**Description**: Delete campaign using GET HTTP method

**Request** (GET):
```bash
curl -X GET "https://your-server.com/i/push/message/remove?api_key=YOUR_API_KEY&app_id=507f1f77bcf86cd799439012&_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{}
```

### Example 6: Attempt to delete nonexistent message

**Description**: Delete message that doesn't exist (idempotent - returns success)

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/remove" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439999"
```

**Response** (200):
```json
{}
```

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `Status` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `draft` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `active` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `stopped` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `scheduled` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `sending` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `sent` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `deleted` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `pending` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `canceled` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Operation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Toggle (Stop)` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Delete` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `messages` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `message_schedules` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `systemlogs` | Audit trail | Stores system action records read/written by this endpoint. |
| `No restore` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Soft delete only` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No undo` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Database cleanup` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Audit trail` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Validation time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Message query` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Update time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Schedule updates` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Audit logging` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Total response time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message Create](./message-create.md) - Create campaign to replace deleted one
- [Message Update](./message-update.md) - Update campaign (rejected for deleted messages)
- [Message Toggle](./message-toggle.md) - Stop/start automated campaigns (reversible alternative)
- [Message List](./message-all.md) - List campaigns (excludes deleted)
- [Message Get](./message-get.md) - Retrieve campaign details (returns 404 for deleted)

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - message deleted | `{}` |
| `200` | Message already deleted | `{}` (idempotent) |
| `200` | Message not found | `{}` (idempotent) |
| `400` | Missing `_id` parameter | `{"errors": ["_id is required"]}` |
| `400` | Invalid ObjectID format | `{"errors": ["_id must be ObjectID"]}` |
| `500` | Database error | `{"kind": "ServerError", "errors": ["Server error"]}` |

**Note**: The endpoint is idempotent - deleting a nonexistent or already-deleted message returns success (`{}`).

---

## Implementation Notes

1. **Soft delete**: Message marked as deleted, not physically removed
2. **Idempotent**: Safe to call multiple times with same `_id`
3. **Schedule cancelation**: All associated schedules canceled automatically
4. **Audit trail**: Original message logged to systemlogs before deletion
5. **No restore**: Cannot be undone via API (manual database edit required)
6. **Empty response**: Success indicated by `{}` and 200 status code
7. **Database preservation**: Deleted messages remain in database for consistency
8. **UI visibility**: Deleted messages hidden from UI by default
9. **Update protection**: [Message Update](./message-update.md) rejects deleted messages
10. **Analytics preserved**: Historical analytics data not affected by deletion
11. **Backup inclusion**: Deleted messages included in database backups
12. **Manual cleanup**: Physical removal requires manual database maintenance (not recommended)

## Last Updated

February 2026
