---
sidebar_label: "Message Toggle"
---

# /i/push/message/toggle

## Overview

Start or stop automated push notification campaigns (Event, Cohort, API, Multi, or Recurring triggers). Toggle between active and stopped states without deleting the campaign. Useful for temporarily pausing campaigns, seasonal campaigns, or testing. Only applicable to automated campaigns; one-time scheduled campaigns cannot be toggled.

**Related Endpoints**:
- [Message Create](./message-create.md) - Create automated campaign
- [Message Update](./message-update.md) - Update campaign settings
- [Message Delete](./message-remove.md) - Permanently remove campaign
- [Message Get](./message-get.md) - Retrieve campaign status

---

## Endpoint


```plaintext
/i/push/message/toggle
```

## Authentication

- **Required Permission**: Update access to `push` feature (`validateUpdate`)
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
| `_id` | ObjectID | Yes | Message ID to toggle |
| `active` | Boolean | Yes | `true` to start (activate), `false` to stop (deactivate) |

### Toggleable Trigger Types

| Trigger Kind | Toggleable | Description |
|--------------|------------|-------------|
| `api` | ✅ Yes | API-triggered notifications |
| `event` | ✅ Yes | Event-triggered notifications |
| `cohort` | ✅ Yes | Cohort entry/exit notifications |
| `multi` | ✅ Yes | Multi-trigger campaigns |
| `recurring` | ✅ Yes | Recurring scheduled notifications |
| `plain` | ❌ No | One-time scheduled (cannot toggle) |

## Response

#### Success Response - Message Toggled
**Status Code**: `200 OK`

**Body**: Complete updated message object

### Success Response

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "app": "507f1f77bcf86cd799439012",
  "platforms": ["i", "a"],
  "status": "active",
  "triggers": [{
    "kind": "event",
    "events": ["purchase"],
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-12-31T23:59:59.000Z"
  }],
  "contents": [{
    "message": "Thank you for your purchase!",
    "title": "Purchase Confirmation"
  }],
  "info": {
    "updated": "2024-12-16T10:30:00.000Z",
    "updatedBy": "507f191e810c19729de860ea",
    "updatedByName": "John Doe"
  }
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

#### Error Response - Not Automated
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "kind": "ValidationError",
  "errors": [
    "The message doesn't have API, Cohort, Event, Multi or Recurring trigger"
  ]
}
```

#### Error Response - Already Active
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "kind": "ValidationError",
  "errors": [
    "The message is already active"
  ]
}
```

#### Error Response - Already Stopped
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "kind": "ValidationError",
  "errors": [
    "The message is already stopped"
  ]
}
```

#### Error Response - Invalid Status
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "kind": "ValidationError",
  "errors": [
    "Message can only be toggled if it is active or stopped"
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
   - Validates `_id` (ObjectID format)
   - Validates `active` (boolean or string "true"/"false")
   - Returns 400 if validation fails

2. **Message Retrieval**
   - Queries `messages` collection for message with `_id`
   - Returns 404 if message not found

3. **Trigger Type Check**
   - Checks if message has toggleable trigger: `api`, `event`, `cohort`, `multi`, `recurring`
   - Returns ValidationError if using `plain` trigger (one-time scheduled)
   - **Error**: "The message doesn't have API, Cohort, Event, Multi or Recurring trigger"

4. **Status Check**
   - Verifies current status is `active` or `stopped`
   - Returns ValidationError if status is `draft`, `scheduled`, `sending`, `sent`, `deleted`
   - **Error**: "Message can only be toggled if it is active or stopped"

5. **Toggle State Validation**
   - If activating (`active: true`):
     - Checks current status is not already `active`
     - Returns ValidationError if already active
   - If stopping (`active: false`):
     - Checks current status is not already `stopped`
     - Returns ValidationError if already stopped

6. **Status Update**
   - Sets new status: `active` (if starting) or `stopped` (if stopping)
   - Updates metadata:
     - `info.updated = new Date()`
     - `info.updatedBy = member._id`
     - `info.updatedByName = member.full_name`
   - Writes to `messages` collection

7. **Scheduling** (if activating)
   - Calls `scheduleIfEligible()` to set up event/cohort listeners
   - For API triggers: Marks as ready for API sends
   - For recurring: Schedules next occurrence

8. **System Logging**
   - If **activating**: Dispatches `push_message_activated` action
   - If **stopping**: Dispatches `push_message_deactivated` action
   - Includes complete message object in audit trail

9. **Response**
   - Returns complete updated message object
   - Includes new status and updated metadata

### Toggle State Transitions

**Start (Activate)** (`active: true`):
- Current status: `stopped`
- New status: `active`
- Effect: Campaign resumes sending notifications

**Stop (Deactivate)** (`active: false`):
- Current status: `active`
- New status: `stopped`
- Effect: Campaign stops sending notifications

**Valid Transitions**:
```
stopped + active:true  → active   (Start)
active  + active:false → stopped  (Stop)
```

**Invalid Transitions**:
```
active  + active:true  → Error (Already active)
stopped + active:false → Error (Already stopped)
draft   + active:*     → Error (Cannot toggle draft)
scheduled + active:*   → Error (Use plain trigger, not toggleable)
sending + active:*     → Error (Currently sending)
sent    + active:*     → Error (Already completed)
deleted + active:*     → Error (Deleted message)
```

### Automated vs One-Time Campaigns

**Automated Campaigns** (Toggleable):
- **Event trigger**: Send when users perform events
- **Cohort trigger**: Send when users enter/exit cohorts
- **API trigger**: Send via API call
- **Multi trigger**: Multiple trigger conditions
- **Recurring trigger**: Repeating schedule

**One-Time Campaigns** (Not Toggleable):
- **Plain trigger**: Single scheduled send
- Cannot be toggled (use [Message Delete](./message-remove.md) or create new)

### Scheduling Behavior

**When Activating** (`active: true`):
1. **Event triggers**: Sets up event listeners
   - Listens for specified events
   - Sends notification when event occurs
   - Respects delay, cap, sleep parameters

2. **Cohort triggers**: Sets up cohort listeners
   - Monitors cohort membership changes
   - Sends on entry/exit as configured
   - Respects time, delay, cancels parameters

3. **API triggers**: Marks as ready
   - No active listeners
   - Waits for API send requests
   - Respects cap, sleep parameters

4. **Recurring triggers**: Schedules next occurrence
   - Creates schedule entry for next run
   - Repeats on configured interval

**When Stopping** (`active: false`):
- Removes event/cohort listeners
- Cancels pending schedules
- API sends will be rejected
- No new notifications sent until reactivated

### Use Cases

**Seasonal Campaigns**:
- Stop holiday campaign after season ends
- Restart next year without recreating

**A/B Testing**:
- Stop underperforming variant
- Continue best-performing variant

**Maintenance**:
- Stop campaign during system maintenance
- Restart after maintenance completes

**Budget Control**:
- Stop campaign when budget limit reached
- Restart when budget renewed

**Performance Issues**:
- Stop campaign causing issues
- Debug and restart when fixed

**Content Updates**:
- Stop campaign
- Update content with [Message Update](./message-update.md)
- Restart campaign with new content

---

## Examples

### Example 1: Start event-triggered campaign

**Description**: Activate stopped event campaign

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/toggle" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439011" \
  -d "active=true"
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "active",
  "triggers": [{
    "kind": "event",
    "events": ["purchase"]
  }],
  "info": {
    "updated": "2024-12-16T10:30:00.000Z",
    "updatedBy": "507f191e810c19729de860ea"
  }
}
```

### Example 2: Stop cohort-triggered campaign

**Description**: Deactivate active cohort campaign

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/toggle" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011",
    "active": false
  }'
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "stopped",
  "triggers": [{
    "kind": "cohort",
    "cohorts": ["premium_users"],
    "entry": true
  }],
  "info": {
    "updated": "2024-12-16T10:35:00.000Z",
    "updatedBy": "507f191e810c19729de860ea"
  }
}
```

### Example 3: Start API-triggered campaign

**Description**: Activate stopped API campaign

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/toggle" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439011" \
  -d "active=true"
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "active",
  "triggers": [{
    "kind": "api",
    "start": "2024-01-01T00:00:00.000Z"
  }],
  "info": {
    "updated": "2024-12-16T10:40:00.000Z"
  }
}
```

### Example 4: Stop recurring campaign

**Description**: Pause recurring weekly notification

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/toggle" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439011" \
  -d "active=false"
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "stopped",
  "triggers": [{
    "kind": "recurring",
    "start": "2024-01-01T09:00:00.000Z",
    "interval": 604800000
  }],
  "info": {
    "updated": "2024-12-16T10:45:00.000Z"
  }
}
```

### Example 5: Attempt to toggle one-time campaign (Error)

**Description**: Try to toggle plain trigger campaign

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/toggle" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439011" \
  -d "active=true"
```

**Response** (400):
```json
{
  "kind": "ValidationError",
  "errors": [
    "The message doesn't have API, Cohort, Event, Multi or Recurring trigger"
  ]
}
```

### Example 6: Attempt to start already-active campaign (Error)

**Description**: Try to activate active campaign

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/toggle" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439011" \
  -d "active=true"
```

**Response** (400):
```json
{
  "kind": "ValidationError",
  "errors": [
    "The message is already active"
  ]
}
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
| `Operation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `**Toggle (Stop)**` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `**Delete**` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `messages` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `message_schedules` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `systemlogs` | Audit trail | Stores system action records read/written by this endpoint. |
| `Toggleable triggers only` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Active/Stopped only` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No partial toggle` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Idempotency` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No scheduling` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Validation time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Message query` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Status update` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Audit logging` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Total response time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message Create](./message-create.md) - Create automated campaign for toggling
- [Message Update](./message-update.md) - Update campaign settings
- [Message Delete](./message-remove.md) - Permanently remove campaign
- [Message Get](./message-get.md) - Check campaign status before toggling
- [Message List](./message-all.md) - View all campaigns with their statuses

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - message toggled | Complete updated message object |
| `400` | Missing required parameters | `{"errors": ["_id is required", "active is required"]}` |
| `400` | Invalid ObjectID format | `{"errors": ["_id must be ObjectID"]}` |
| `400` | Not automated campaign | `{"kind": "ValidationError", "errors": ["The message doesn't have API, Cohort, Event, Multi or Recurring trigger"]}` |
| `400` | Cannot toggle current status | `{"kind": "ValidationError", "errors": ["Message can only be toggled if it is active or stopped"]}` |
| `400` | Already active | `{"kind": "ValidationError", "errors": ["The message is already active"]}` |
| `400` | Already stopped | `{"kind": "ValidationError", "errors": ["The message is already stopped"]}` |
| `404` | Message not found | `{"errors": ["Message not found"]}` |
| `500` | Database error | `{"kind": "ServerError", "errors": ["Server error"]}` |

---

## Implementation Notes

1. **Automated only**: Only works with API, Event, Cohort, Multi, or Recurring triggers
2. **Status validation**: Checks current status before toggling
3. **Not idempotent**: Returns error if already in target state (improves error detection)
4. **Audit trail**: All toggles logged to systemlogs with different actions for activate/deactivate
5. **Scheduling**: Activation triggers scheduling setup (event/cohort listeners, recurring schedules)
6. **Metadata tracking**: Updates `info.updated`, `updatedBy`, `updatedByName` on every toggle
7. **Plain trigger rejection**: One-time scheduled campaigns must use [Message Delete](./message-remove.md) instead
8. **No partial toggle**: Cannot toggle specific platforms or triggers within a campaign
9. **Reversible**: Can toggle between active and stopped multiple times
10. **Immediate effect**: Status change takes effect immediately
11. **Schedule management**: Stopped campaigns have event/cohort listeners removed
12. **API ready**: Activating API-triggered campaigns marks them as ready for API sends

## Last Updated

February 2026
