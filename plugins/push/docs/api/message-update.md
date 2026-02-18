---
sidebar_label: "Message Update"
---

# /i/push/message/update

## Overview

Update an existing push notification campaign. Supports updating draft messages (full edit capability) and active/scheduled messages (before first send only). Changes include content, triggers, filters, platforms, and other campaign properties. Draft-to-active transition triggers scheduling and approval workflows.

**Related Endpoints**:
- [Message Create](./message-create.md) - Create new campaign
- [Message Get](./message-get.md) - Retrieve campaign details
- [Message Delete](./message-remove.md) - Delete campaign
- [Message Toggle](./message-toggle.md) - Start/stop automated campaigns

---

## Endpoint


```plaintext
/i/push/message/update
```

## Authentication

- **Required Permission**: Update access to `push` feature (`validateUpdate`)
- **HTTP Methods**: POST recommended (GET supported but not practical due to payload size)
- **Content-Type**: application/x-www-form-urlencoded or JSON

**HTTP Method Flexibility:**  
All Countly endpoints accept any HTTP method (GET, POST, PUT, DELETE) interchangeably. However, due to the complex payload size of push messages, POST is strongly recommended.

## Request Parameters

**All parameters from [Message Create](./message-create.md) are supported, plus:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `_id` | ObjectID | Yes | Message ID to update |
| `status` | String | No | Set to `"active"` to activate draft, omit for other updates |

**Key Parameters (see [Message Create](./message-create.md) for complete list)**:
- `api_key` (String, required): API authentication key
- `app_id` / `app` (ObjectID, required): Application ID
- `platforms` (String[], required for active): Platforms to send to
- `triggers` (Object[], required for active): Trigger definitions
- `contents` (Object[], required for active): Content array
- `filter` (Object, optional): Audience targeting
- `saveResults` (Boolean, optional): Store individual results
- `info.title` (String, optional): Campaign title

## Response

#### Success Response - Message Updated
**Status Code**: `200 OK`

**Body**: Complete updated message object

### Success Response

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "app": "507f1f77bcf86cd799439012",
  "platforms": ["i", "a"],
  "status": "scheduled",
  "triggers": [{
    "kind": "plain",
    "start": "2024-12-31T18:00:00.000Z"
  }],
  "contents": [{
    "message": "Updated message text",
    "title": "Updated Title"
  }],
  "info": {
    "title": "Updated Campaign",
    "created": "2024-12-15T10:30:00.000Z",
    "createdBy": "507f191e810c19729de860ea",
    "updated": "2024-12-16T14:20:00.000Z",
    "updatedBy": "507f191e810c19729de860ea",
    "updatedByName": "John Doe"
  }
}
```

#### Error Response - Deleted Message
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "kind": "ValidationError",
  "errors": [
    "Deleted messages cannot be updated"
  ]
}
```

#### Error Response - Validation Error
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "kind": "ValidationError",
  "errors": [
    "_id is required",
    "platforms is required"
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

#### Error Response - Scheduling Error
**Status Code**: `500 Internal Server Error`

**Body**:
```json
{
  "errors": [
    "Error while scheduling the message. Check the API logs for details."
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

- Required Permission: Update access to push feature (validateUpdate)

## Behavior/Processing

### Operation Flow

1. **Validation**
   - Validates `_id` parameter (message to update)
   - If activating draft (status → "active"): Full validation (platforms, triggers, contents)
   - If updating draft: Relaxed validation (allows incomplete data)
   - If updating active/scheduled: Validates message hasn't started sending

2. **Message Retrieval**
   - Queries `messages` collection for message with `_id`
   - Checks message exists and not deleted
   - Returns 404 if not found

3. **Status Check**
   - **Deleted messages**: Rejected with ValidationError
   - **Draft**: Can be fully edited
   - **Active/Scheduled**: Can be updated before first send
   - **Sending/Sent**: Update restrictions apply (implementation-dependent)

4. **Update Metadata**
   - Sets `info.updated` to current timestamp
   - Sets `info.updatedBy` to member ID
   - Sets `info.updatedByName` to member full name

5. **Draft Activation** (if `status: "active"` on draft)
   - Changes status from "draft" to "active"
   - Saves message to database
   - **Push Approver Integration** (if feature enabled):
     - Calls `push_approver.onMessageActivated()`
     - May change status to "inactive" (pending approval)
   - **Scheduling**:
     - Calls `scheduleIfEligible()` to queue message
     - May fail if scheduling error occurs
   - **System Logging**:
     - Dispatches `push_message_updated_draft` action to systemlogs

6. **Regular Update** (not activating)
   - Saves updated message to database
   - Dispatches `push_message_updated` action to systemlogs

7. **Response**
   - Returns complete updated message object
   - Includes all generated/updated metadata

### Update Restrictions by Status

**Draft Messages**:
- ✅ Full edit capability
- ✅ All fields can be changed
- ✅ Can add/remove platforms, triggers, content
- ✅ Can be activated via `status: "active"`
- ✅ No restrictions

**Active/Scheduled Messages (Before First Send)**:
- ✅ Can update content (message, title, media, etc.)
- ✅ Can update filter (audience targeting)
- ✅ Can update trigger dates (reschedule)
- ⚠️ Limited platform changes (implementation-dependent)
- ⚠️ Limited trigger type changes (implementation-dependent)

**Sent/Sending Messages**:
- ❌ Cannot update (implementation may vary)
- ❌ Would require creating new campaign
- ℹ️ Use [Message Toggle](./message-toggle.md) to stop automated campaigns

**Deleted Messages**:
- ❌ Cannot update (hard rejection)
- Returns ValidationError

### Draft Activation Workflow

When updating a draft with `status: "active"`:

```
1. Draft → Active status change
2. Save to database
3. Check Push Approver feature:
   - If enabled: May go to "inactive" (pending approval)
   - If not enabled: Stays "active"
4. Schedule if eligible:
   - Plain trigger: Schedule for send date
   - Event/Cohort trigger: Set up event listeners
   - API trigger: Ready for API-triggered sends
   - Recurring trigger: Schedule recurring jobs
5. Log to systemlogs (push_message_updated_draft)
6. Return updated message
```

### Push Approver Integration

If Push Approver feature is enabled:

1. **On Activation** (`status: "draft"` → `"active"`):
   - Calls `push_approver.onMessageActivated(params, msg)`
   - Approver may change status to `"inactive"`
   - Message requires approval before sending
   - Approval workflow:
     - Admin reviews message in Push Approver UI
     - Admin approves or rejects
     - If approved: Status → "active", scheduling occurs
     - If rejected: Status remains "inactive"

2. **Regular Updates**:
   - Push Approver not invoked
   - Updates don't require re-approval

### Scheduling Behavior

**Scheduling occurs when**:
1. Draft → Active transition
2. Message has eligible trigger (plain, event, cohort, api, recurring)
3. Trigger start date is in future (for plain triggers)

**Scheduling actions**:
- **Plain trigger**: Creates schedule entry in `message_schedules` collection
- **Event trigger**: Sets up event listener, no schedule entry
- **Cohort trigger**: Sets up cohort listener, no schedule entry
- **API trigger**: Marks as ready, no schedule entry
- **Recurring trigger**: Creates recurring schedule entries

**Scheduling errors**:
- Returns 500 status code
- Error message: "Error while scheduling the message. Check the API logs for details."
- Message saved but not scheduled (requires manual intervention)

---

## Examples

### Example 1: Update draft content

**Description**: Update message text and title on draft campaign

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/update" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011",
    "platforms": ["i"],
    "triggers": [{
      "kind": "plain",
      "start": "2024-12-31T18:00:00.000Z"
    }],
    "contents": [{
      "message": "Updated: Happy New Year 2025!",
      "title": "Celebration 2025"
    }]
  }'
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "draft",
  "contents": [{
    "message": "Updated: Happy New Year 2025!",
    "title": "Celebration 2025"
  }],
  "info": {
    "updated": "2024-12-16T14:20:00.000Z",
    "updatedBy": "507f191e810c19729de860ea",
    "updatedByName": "John Doe"
  }
}
```

### Example 2: Activate draft (draft → active)

**Description**: Activate draft campaign for scheduling and sending

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/update" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011",
    "status": "active",
    "platforms": ["i", "a"],
    "triggers": [{
      "kind": "plain",
      "start": "2024-12-31T18:00:00.000Z"
    }],
    "contents": [{
      "message": "Happy New Year!",
      "title": "Celebration"
    }]
  }'
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "scheduled",
  "info": {
    "updated": "2024-12-16T14:30:00.000Z",
    "updatedBy": "507f191e810c19729de860ea"
  }
}
```

### Example 3: Reschedule active campaign

**Description**: Change send date/time for scheduled campaign

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/update" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011",
    "platforms": ["i", "a"],
    "triggers": [{
      "kind": "plain",
      "start": "2025-01-15T10:00:00.000Z"
    }],
    "contents": [{
      "message": "Happy New Year!",
      "title": "Celebration"
    }]
  }'
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "scheduled",
  "triggers": [{
    "kind": "plain",
    "start": "2025-01-15T10:00:00.000Z"
  }],
  "info": {
    "updated": "2024-12-16T15:00:00.000Z"
  }
}
```

### Example 4: Update audience filter

**Description**: Change targeting to premium US users only

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/update" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011",
    "platforms": ["i", "a"],
    "triggers": [{
      "kind": "plain",
      "start": "2024-12-31T18:00:00.000Z"
    }],
    "contents": [{
      "message": "Happy New Year!",
      "title": "Celebration"
    }],
    "filter": {
      "user": "{\"country\":\"US\",\"custom.premium\":true}"
    }
  }'
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "filter": {
    "user": "{\"country\":\"US\",\"custom.premium\":true}"
  },
  "info": {
    "updated": "2024-12-16T15:10:00.000Z"
  }
}
```

### Example 5: Add personalization

**Description**: Add user name personalization to existing campaign

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/update" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011",
    "platforms": ["i"],
    "triggers": [{
      "kind": "plain",
      "start": "2024-12-31T18:00:00.000Z"
    }],
    "contents": [{
      "message": " {first_name}, Happy New Year!",
      "messagePers": {
        "0": {
          "k": "first_name",
          "t": "c",
          "c": true,
          "f": "Friend"
        }
      },
      "title": "Celebration"
    }]
  }'
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "contents": [{
    "message": " {first_name}, Happy New Year!",
    "messagePers": {
      "0": {
        "k": "first_name",
        "t": "c",
        "c": true,
        "f": "Friend"
      }
    }
  }],
  "info": {
    "updated": "2024-12-16T15:20:00.000Z"
  }
}
```

### Example 6: Update campaign title

**Description**: Change internal campaign name in UI

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/update" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011",
    "platforms": ["i"],
    "triggers": [{
      "kind": "plain",
      "start": "2024-12-31T18:00:00.000Z"
    }],
    "contents": [{
      "message": "Happy New Year!",
      "title": "Celebration"
    }],
    "info": {
      "title": "New Year Campaign 2025"
    }
  }'
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "info": {
    "title": "New Year Campaign 2025",
    "updated": "2024-12-16T15:30:00.000Z"
  }
}
```

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `Feature` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Message ID` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Draft mode` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Validation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Metadata` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Audit trail` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Response` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `messages` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `message_schedules` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `systemlogs` | Audit trail | Stores system action records read/written by this endpoint. |
| `apps.features.push.{platform}._id` | Application metadata/config | Stores app-level settings and metadata read/updated by this endpoint. |
| `DEFAULTS.max_media_size` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Deleted messages` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `Sent messages` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `Running campaigns` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Approval required` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Scheduling errors` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Validation time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Database writes` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Draft activation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Approval check` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Response time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message Create](./message-create.md) - Create new campaign
- [Message Get](./message-get.md) - Retrieve campaign for editing
- [Message Delete](./message-remove.md) - Delete campaign
- [Message Toggle](./message-toggle.md) - Start/stop automated campaigns
- [Message Test](./message-test.md) - Test before activation
- [Message Estimate](./message-estimate.md) - Estimate reach before activation

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - message updated | Complete updated message object |
| `400` | Missing `_id` parameter | `{"errors": ["_id is required"]}` |
| `400` | Validation error | `{"kind": "ValidationError", "errors": [...]}` |
| `400` | Deleted message | `{"kind": "ValidationError", "errors": ["Deleted messages cannot be updated"]}` |
| `400` | Invalid trigger configuration | `{"kind": "ValidationError", "errors": ["start is required"]}` |
| `400` | No push credentials | `{"kind": "ValidationError", "errors": ["No push credentials for iOS platform"]}` |
| `404` | Message not found | `{"errors": ["Message not found"]}` |
| `500` | Scheduling error | `{"errors": ["Error while scheduling the message. Check the API logs for details."]}` |
| `500` | Database error | `{"kind": "ServerError", "errors": ["Server error"]}` |

---

## Implementation Notes

1. **Message ID required**: `_id` parameter mandatory for identifying message to update
2. **Status transition**: Draft → Active triggers scheduling and approval workflows
3. **Metadata tracking**: Automatically updates `info.updated`, `updatedBy`, `updatedByName`
4. **Deleted protection**: Cannot update deleted messages (hard validation)
5. **Validation modes**: Relaxed for drafts, full for active/activating messages
6. **Push Approver**: Only invoked on draft activation, not regular updates
7. **Scheduling**: Only occurs on draft activation or reschedule changes
8. **Audit trail**: All updates logged to systemlogs with different actions for draft activation vs regular update
9. **Error recovery**: Scheduling errors return 500 but message may be saved
10. **Concurrent updates**: No locking mechanism, last write wins
11. **Partial updates**: Can update specific fields without providing full message object (implementation-dependent)
12. **Backward compatibility**: Supports legacy parameter formats

## Last Updated

February 2026
