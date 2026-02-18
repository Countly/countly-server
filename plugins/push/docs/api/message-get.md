---
sidebar_label: "Message Get"
---

# /o/push/message

## Overview

Retrieve detailed information about a specific push notification campaign by ID. Returns complete message object including content, triggers, filters, results, schedules, and metadata. Useful for viewing campaign details, editing campaigns, or monitoring campaign status.

**Related Endpoints**:
- [Message List](./message-all.md) - List all campaigns
- [Message Update](./message-update.md) - Update campaign after retrieving
- [Message Stats](./message-stats.md) - Get time-series statistics
- [Message Create](./message-create.md) - Create new campaign

---

## Endpoint


```plaintext
/o/push/message
```

## Authentication

- **Required Permission**: Read access to `push` feature (`validateRead`)
- **HTTP Methods**: GET recommended (all methods supported)
- **Content-Type**: application/x-www-form-urlencoded or JSON

**HTTP Method Flexibility:**  
All Countly endpoints accept any HTTP method (GET, POST, PUT, DELETE) interchangeably.

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API authentication key |
| `app_id` | String | Yes | Application ID (alias for `app`) |
| `app` | ObjectID | Yes | Application ID (MongoDB ObjectID) |
| `_id` | ObjectID | Yes | Message ID to retrieve |

## Response

#### Success Response - Message Found
**Status Code**: `200 OK`

**Body**: Complete message object with schedules

### Success Response

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "app": "507f1f77bcf86cd799439012",
  "platforms": ["i", "a"],
  "status": "scheduled",
  "state": 1,
  "saveResults": false,
  "filter": {
    "user": "{\"country\":\"US\"}",
    "drill": null,
    "geos": [],
    "cohorts": []
  },
  "triggers": [{
    "kind": "plain",
    "start": "2024-12-31T18:00:00.000Z",
    "sctz": -180,
    "delayed": false
  }],
  "contents": [{
    "message": "Happy New Year!",
    "title": "Celebration",
    "sound": "default",
    "badge": 1,
    "url": "https://example.com/newyear",
    "media": "https://cdn.example.com/newyear.jpg",
    "mediaMime": "image/jpeg"
  }],
  "result": {
    "total": 15420,
    "processed": 0,
    "sent": 0,
    "actioned": 0,
    "failed": 0,
    "lastErrors": [],
    "lastRuns": [],
    "next": "2024-12-31T18:00:00.000Z"
  },
  "info": {
    "title": "New Year Campaign",
    "appName": "My App",
    "created": "2024-12-15T10:30:00.000Z",
    "createdBy": "507f191e810c19729de860ea",
    "createdByName": "John Doe",
    "updated": "2024-12-16T14:20:00.000Z",
    "updatedBy": "507f191e810c19729de860ea",
    "updatedByName": "John Doe"
  },
  "schedules": [
    {
      "_id": "507f1f77bcf86cd799439099",
      "messageId": "507f1f77bcf86cd799439011",
      "status": "scheduled",
      "scheduledTo": "2024-12-31T18:00:00.000Z",
      "created": "2024-12-15T10:30:00.000Z"
    }
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

- Required Permission: Read access to push feature (validateRead)

## Behavior/Processing

### Operation Flow

1. **Validation**
   - Validates `_id` parameter (ObjectID format)
   - Returns 400 if validation fails

2. **Message Retrieval with Schedules**
   - Queries `messages` collection with aggregation pipeline
   - Performs `$lookup` join with `message_schedules` collection
   - Retrieves last 20 schedules for the message
   - Sorts schedules by `scheduledTo` descending (most recent first)

3. **Message Not Found Check**
   - Returns 404 if no message found with given `_id`

4. **Status Calculation**
   - Calls `getMessageStatus(message, lastSchedule)` to calculate current status
   - Status may differ from database value based on schedule state
   - Example: Database says "scheduled", but schedule failed → status becomes "failed"

5. **Response**
   - Returns complete message object
   - Includes `schedules` array with up to 20 recent schedules
   - Status field reflects calculated runtime status

### Message Object Structure

**Core Fields**:
- **`_id`** (ObjectID): Unique message identifier
- **`app`** (ObjectID): Application ID
- **`platforms`** (String[]): Target platforms (`i`, `a`, `w`, `h`)
- **`status`** (String): Campaign status (calculated at runtime)
- **`state`** (Number): Internal state flag (for processing)
- **`saveResults`** (Boolean): Whether to save individual push results

**Targeting Fields**:
- **`filter`** (Object): Audience targeting filters
  - `user` (String): MongoDB query for app_users collection
  - `drill` (String): Drill filter query
  - `geos` (ObjectID[]): Geo location IDs
  - `cohorts` (String[]): Cohort IDs

**Trigger Fields** (see [Message Create](./message-create.md) for detailed trigger documentation):
- **`triggers`** (Object[]): Array of trigger definitions
  - Plain, Event, Cohort, API, Multi, or Recurring triggers
  - Each with specific configuration parameters

**Content Fields** (see [Message Create](./message-create.md) for detailed content documentation):
- **`contents`** (Object[]): Array of content variants
  - Platform-specific and language-specific overrides
  - Message, title, media, buttons, personalization

**Result Fields**:
- **`result`** (Object): Send results and statistics
  - `total` (Number): Total notifications to send
  - `processed` (Number): Processed so far
  - `sent` (Number): Successfully sent
  - `actioned` (Number): User interactions (taps, button clicks)
  - `failed` (Number): Failed to send
  - `lastErrors` (String[]): Last 10 errors
  - `lastRuns` (Date[]): Last 10 run timestamps
  - `next` (Date): Next scheduled send (for recurring/automated)

**Metadata Fields**:
- **`info`** (Object): Campaign metadata
  - `title` (String): Campaign name (internal)
  - `appName` (String): Application name
  - `created` (Date): Creation timestamp
  - `createdBy` (ObjectID): Creator user ID
  - `createdByName` (String): Creator name
  - `updated` (Date): Last update timestamp
  - `updatedBy` (ObjectID): Last updater user ID
  - `updatedByName` (String): Last updater name
  - Additional fields for approval, removal, start/finish timestamps

**Schedule Fields**:
- **`schedules`** (Object[]): Array of schedule entries (last 20)
  - `_id` (ObjectID): Schedule ID
  - `messageId` (ObjectID): Message reference
  - `status` (String): Schedule status
  - `scheduledTo` (Date): Target send time
  - `created` (Date): Schedule creation time

### Status Calculation

The endpoint calculates runtime status based on message and schedule state:

**Status Values** (see [Message Create](./message-create.md) for complete status documentation):
- **`draft`**: Not activated, editable
- **`inactive`**: Pending approval (Push Approver)
- **`scheduled`**: Scheduled for future send
- **`sending`**: Currently sending
- **`sent`**: Completed successfully
- **`stopped`**: Automated campaign stopped
- **`failed`**: Send failed
- **`deleted`**: Soft deleted (should not appear in results)

**Calculation Logic**:
```javascript
function getMessageStatus(message, lastSchedule) {
  if (message.status === "deleted") return "deleted";
  if (message.status === "draft") return "draft";
  if (message.status === "inactive") return "inactive";
  
  if (lastSchedule) {
    if (lastSchedule.status === "sending") return "sending";
    if (lastSchedule.status === "sent") return "sent";
    if (lastSchedule.status === "failed") return "failed";
    if (lastSchedule.status === "scheduled") return "scheduled";
  }
  
  return message.status;
}
```

### Schedule Data

The response includes up to 20 most recent schedules for the message:

**Schedule Fields**:
- **`_id`**: Unique schedule identifier
- **`messageId`**: Reference to parent message
- **`status`**: Schedule status (`scheduled`, `sending`, `sent`, `canceled`, `failed`)
- **`scheduledTo`**: Target send timestamp
- **`created`**: When schedule was created

**Use Cases**:
- View upcoming sends (plain triggers)
- Check send history (last 20 attempts)
- Debug failed sends
- Monitor recurring campaign schedules

**Sorting**: Schedules sorted by `scheduledTo` descending (most recent first)

---

## Examples

### Example 1: Get simple scheduled campaign

**Description**: Retrieve details of one-time scheduled campaign

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "scheduled",
  "platforms": ["i"],
  "triggers": [{
    "kind": "plain",
    "start": "2024-12-31T18:00:00.000Z"
  }],
  "contents": [{
    "message": "Happy New Year!",
    "title": "Celebration"
  }],
  "result": {
    "total": 5000,
    "processed": 0,
    "sent": 0
  },
  "schedules": [{
    "status": "scheduled",
    "scheduledTo": "2024-12-31T18:00:00.000Z"
  }]
}
```

### Example 2: Get event-triggered campaign

**Description**: Retrieve automated event campaign details

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439022"
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439022",
  "status": "active",
  "platforms": ["i", "a"],
  "triggers": [{
    "kind": "event",
    "events": ["purchase"],
    "start": "2024-01-01T00:00:00.000Z",
    "end": "2024-12-31T23:59:59.000Z",
    "delay": 300000,
    "cap": 3,
    "sleep": 86400000
  }],
  "contents": [{
    "message": "Thank you for your purchase!",
    "title": "Purchase Confirmation"
  }],
  "result": {
    "total": 15420,
    "processed": 12500,
    "sent": 12300,
    "actioned": 3400,
    "failed": 200
  },
  "schedules": []
}
```

### Example 3: Get draft campaign

**Description**: Retrieve draft campaign for editing

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439033"
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439033",
  "status": "draft",
  "platforms": ["i"],
  "triggers": [{
    "kind": "plain",
    "start": "2024-12-25T10:00:00.000Z"
  }],
  "contents": [{
    "message": "Draft message",
    "title": "Draft"
  }],
  "info": {
    "title": "Christmas Campaign Draft",
    "created": "2024-12-01T09:00:00.000Z"
  },
  "schedules": []
}
```

### Example 4: Get campaign with personalization

**Description**: Retrieve campaign with personalized content

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439044"
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439044",
  "status": "scheduled",
  "contents": [{
    "message": " {first_name}, check out our new features!",
    "messagePers": {
      "0": {
        "k": "first_name",
        "t": "c",
        "c": true,
        "f": "User"
      }
    },
    "title": "New Features"
  }]
}
```

### Example 5: Get recurring campaign

**Description**: Retrieve recurring weekly campaign

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439055"
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439055",
  "status": "active",
  "triggers": [{
    "kind": "recurring",
    "start": "2024-01-01T09:00:00.000Z",
    "interval": 604800000
  }],
  "result": {
    "next": "2024-12-20T09:00:00.000Z"
  },
  "schedules": [
    {
      "scheduledTo": "2024-12-20T09:00:00.000Z",
      "status": "scheduled"
    },
    {
      "scheduledTo": "2024-12-13T09:00:00.000Z",
      "status": "sent"
    },
    {
      "scheduledTo": "2024-12-06T09:00:00.000Z",
      "status": "sent"
    }
  ]
}
```

### Example 6: Message not found (Error)

**Description**: Attempt to retrieve nonexistent message

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799999999"
```

**Response** (404):
```json
{
  "errors": [
    "Message not found"
  ]
}
```

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `messages` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `message_schedules` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Schedule limit` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No filtering` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No expansion` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Status recalculation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Message query` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Schedule join` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Status calculation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Total response time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message List](./message-all.md) - List all campaigns with filters
- [Message Create](./message-create.md) - Create new campaign
- [Message Update](./message-update.md) - Update campaign after retrieval
- [Message Stats](./message-stats.md) - Get time-series statistics
- [Message Delete](./message-remove.md) - Delete campaign
- [Message Toggle](./message-toggle.md) - Start/stop automated campaigns

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - message found | Complete message object with schedules |
| `400` | Missing `_id` parameter | `{"errors": ["_id is required"]}` |
| `400` | Invalid ObjectID format | `{"errors": ["_id must be ObjectID"]}` |
| `404` | Message not found | `{"errors": ["Message not found"]}` |
| `500` | Database error | `{"kind": "ServerError", "errors": ["Server error"]}` |

---

## Implementation Notes

1. **Aggregation-based**: Uses MongoDB aggregation pipeline for efficient join
2. **Schedule limit**: Returns max 20 schedules sorted by `scheduledTo` descending
3. **Runtime status**: Status field calculated at runtime based on message and schedule state
4. **Read-only**: No modifications to message or schedule data
5. **Complete object**: Returns full message object (no field filtering)
6. **Schedule array**: Always present, may be empty (`[]`) for certain trigger types
7. **Deleted messages**: Returns 404 for deleted messages (soft-deleted still in DB)
8. **Pre-update**: Common to retrieve message before updating via [Message Update](./message-update.md)
9. **Reference IDs**: Returns ObjectID references as-is (no expansion to full documents)
10. **Status consistency**: Calculated status may differ from database `status` field
11. **Efficient join**: Schedule join limited to 20 records via pipeline for performance
12. **Audit metadata**: Includes full audit trail (created/updated/removed/approved by)

## Last Updated

February 2026
