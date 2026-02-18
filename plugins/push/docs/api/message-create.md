---
sidebar_label: "Message Create"
---

# /i/push/message/create

## Overview

Create a new push notification campaign. Supports various trigger types (schedule, event-based, cohort-based, API-triggered), audience targeting with filters, multi-platform delivery, and content personalization. Messages can be created as drafts for later activation or as active campaigns for immediate scheduling.

**Related Endpoints**:
- [Message Update](./message-update.md) - Update existing campaign
- [Message Test](./message-test.md) - Send test notification
- [Message List](./message-all.md) - List all campaigns
- [Message Get](./message-get.md) - Get campaign details
- [Message Estimate](./message-estimate.md) - Estimate reach before creating

---

## Endpoint


```plaintext
/i/push/message/create
```

## Authentication

- **Required Permission**: Create access to `push` feature (`validateCreate`)
- **HTTP Methods**: POST recommended (GET supported but not practical due to payload size)
- **Content-Type**: application/x-www-form-urlencoded or JSON

**HTTP Method Flexibility:**  
All Countly endpoints accept any HTTP method (GET, POST, PUT, DELETE) interchangeably. However, due to the complex payload size of push messages, POST is strongly recommended.

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API authentication key |
| `app_id` | String | Yes | Application ID (alias for `app`) |
| `app` | ObjectID | Yes | Application ID (MongoDB ObjectID) |
| `platforms` | String[] | Yes | Platforms to send to: `["i", "a", "w", "h"]` (iOS, Android, Web, Huawei) |
| `status` | String | No | Set to `"draft"` to create draft (editable), omit for active campaign |
| `save Results` | Boolean | No | Store individual push results for debugging (default: false) |
| `filter` | Object | No | Audience targeting filter (empty = all users with tokens) |
| `filter.user` | JSON String | No | MongoDB query for `app_users{APP_ID}` collection |
| `filter.drill` | JSON String | No | Drill plugin filter (requires Drill plugin) |
| `filter.geos` | ObjectID[] | No | Array of geo location IDs |
| `filter.cohorts` | String[] | No | Array of cohort IDs |
| `triggers` | Object[] | Yes | Array of trigger definitions (min: 1) |
| `triggers[].kind` | String | Yes | Trigger type: `"plain"`, `"event"`, `"cohort"`, `"api"`, `"recurring"` |
| `triggers[].start` | Date | Yes | Campaign start date (epoch ms or ISO string) |
| `triggers[].end` | Date | No | Campaign end date (for event/cohort/api triggers) |
| `triggers[].sctz` | Number | No | **[plain only]** Timezone offset in minutes for user-timezone sending |
| `triggers[].delayed` | Boolean | No | **[plain only]** Delay audience selection  to 5 min prior to start |
| `triggers[].time` | Number | No | **[event/cohort]** Time in ms since 00:00 for user-timezone sending |
| `triggers[].delay` | Number | No | **[event/cohort]** Delay in ms after event/cohort change |
| `triggers[].reschedule` | Boolean | No | **[event/cohort]** Allow rescheduling to next day if too late |
| `triggers[].cap` | Number | No | **[event/cohort/api]** Max notifications per user |
| `triggers[].sleep` | Number | No | **[event/cohort/api]** Min ms between notifications per user |
| `triggers[].events` | String[] | No | **[event only]** Event keys to trigger on |
| `triggers[].cohorts` | String[] | No | **[cohort only]** Cohort IDs to trigger on |
| `triggers[].entry` | Boolean | No | **[cohort only]** Trigger on entry (true) or exit (false) |
| `triggers[].cancels` | Boolean | No | **[cohort only]** Cancel if user exits cohort before send |
| `contents` | Object[] | Yes | Array of content objects (min: 1) |
| `contents[0]` | Object | Yes | Default content (no `p` or `la` keys) |
| `contents[].p` | String | No | Platform this content applies to: `i`, `a`, `w`, `h` |
| `contents[].la` | String | No | Language code (2-letter ISO: `en`, `tr`, etc.) |
| `contents[].message` | String | Yes | Notification message text |
| `contents[].messagePers` | Object | No | Message personalization map (index → personalization object) |
| `contents[].title` | String | No | Notification title |
| `contents[].titlePers` | Object | No | Title personalization map |
| `contents[].sound` | String | No | Notification sound |
| `contents[].badge` | Number | No | Notification badge number |
| `contents[].data` | JSON String | No | Custom data payload |
| `contents[].extras` | String[] | No | User property keys to include |
| `contents[].url` | String | No | On-tap URL |
| `contents[].media` | String | No | Media attachment URL |
| `contents[].mediaMime` | String | No | Media MIME type |
| `contents[].buttons` | Object[] | No | Action buttons array |
| `contents[].buttons[].title` | String | Yes | Button title |
| `contents[].buttons[].url` | String | No | Button URL |
| `contents[].specific` | Object | No | Platform-specific options (`subtitle` for iOS, `large_icon` for Android) |
| `info.title` | String | No | Campaign title for UI (internal name) |
| `demo` | Boolean | No | Mark as demo message (for testing/populator) |

## Response

#### Success Response - Campaign Created
**Status Code**: `200 OK`

**Body**: Complete message object with generated `_id` and metadata

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
    "url": "https://example.com/newyear"
  }],
  "result": {
    "total": 0,
    "processed": 0,
    "sent": 0,
    "actioned": 0,
    "failed": 0,
    "lastErrors": [],
    "lastRuns": []
  },
  "info": {
    "title": "New Year Campaign",
    "appName": "My App",
    "created": "2024-12-15T10:30:00.000Z",
    "createdBy": "507f191e810c19729de860ea",
    "createdByName": "John Doe",
    "updated": "2024-12-15T10:30:00.000Z",
    "updatedBy": "507f191e810c19729de860ea",
    "updatedByName": "John Doe"
  }
}
```

#### Error Response - Validation Error
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "kind": "ValidationError",
  "errors": [
    "platforms is required",
    "triggers is required",
    "contents is required"
  ]
}
```

#### Error Response - No Credentials
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "kind": "ValidationError",
  "errors": [
    "No push credentials for iOS platform"
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

- Required Permission: Create access to push feature (validateCreate)

## Behavior/Processing

### Operation Flow

1. **Validation**
   - Validates all required fields and data types
   - For drafts: Relaxed validation (allows incomplete data)
   - For active: Full validation including credentials check

2. **Credentials Verification**
   - Checks `apps.features.push.{platform}._id` exists for each platform
   - Queries `push_{credentials_id}` collection to verify credentials exist
   - Rejects if credentials missing or set to 'demo'

3. **Filter Validation**
   - If `filter.geos` provided: Verifies geo IDs exist in `geos` collection
   - If `filter.cohorts` provided: Verifies cohort IDs exist in `cohorts` collection

4. **Message Creation**
   - Generates new ObjectID for `_id`
   - Sets `info.created`, `info.updated` timestamps
   - Sets `info.createdBy`, `info.createdByName` from member
   - If demo: Sets `info.demo = true`

5. **Status Handling**
   - **Draft**: Sets `status = "draft"`, saves immediately, dispatches `push_message_draft` log
   - **Active**: Sets `status = "active"`, checks Push Approver feature, schedules if eligible

6. **Push Approver Integration** (if feature enabled)
   - Calls `push_approver.onMessageActivated()`
   - May change status to `"inactive"` (pending approval)

7. **Scheduling**
   - Calls `scheduleIfEligible()` to queue message for sending
   - For plain triggers: Schedules based on `start` date
   - For event/cohort/api triggers: Sets up event listeners

8. **System Logging**
   - Dispatches `/systemlogs` event with action `push_message_created`
   - Includes full message JSON in audit trail

9. **Demo Data** (if `demo` parameter set)
   - Generates synthetic engagement data for testing/demos
   - Does not affect actual message sending

10. **Response**
    - Returns complete message object with all generated fields

### Draft vs Active

**Draft Mode** (`status: "draft"`):
- Relaxed validation (can save incomplete data)
- Not scheduled for sending
- Editable without restrictions
- Useful for gradual campaign building in UI

**Active Mode** (status omitted or `status: "active"`):
- Full validation required
- Immediately scheduled (if trigger date is future)
- Requires push credentials configured
- May require approval if Push Approver feature enabled

### Trigger Type Details

**Plain Trigger** (Scheduled):
```json
{
  "kind": "plain",
  "start": "2024-12-31T18:00:00.000Z",
  "sctz": -180,
  "delayed": false
}
```
- Sends at specific date/time
- `sctz`: Timezone offset for user-timezone sending (e.g., -180 for GMT+3)
- `delayed`: Delay audience selection to 5 min before send (for dynamic segments)

**Event Trigger**:
```json
{
  "kind": "event",
  "start": "2024-01-01T00:00:00.000Z",
  "end": "2024-12-31T23:59:59.000Z",
  "events": ["purchase", "level_complete"],
  "delay": 3600000,
  "cap": 5,
  "sleep": 86400000
}
```
- Sends when users perform specified events
- `delay`: Wait time after event (ms)
- `cap`: Max notifications per user during campaign
- `sleep`: Min time between notifications (ms)

**Cohort Trigger**:
```json
{
  "kind": "cohort",
  "start": "2024-01-01T00:00:00.000Z",
  "end": "2024-12-31T23:59:59.000Z",
  "cohorts": ["premium_users"],
  "entry": true,
  "cancels": true,
  "time": 36000000
}
```
- Sends when users enter/exit cohorts
- `entry`: true = send on join, false = send on leave
- `cancels`: Cancel notification if user exits cohort before send
- `time`: Time of day to send (ms since 00:00 in user timezone)

### Content Structure

Content objects are layered with inheritance:
1. First content (index 0) has no `p` or `la` - serves as default
2. Subsequent contents with `p` override default for specific platform
3. Contents with `la` override for specific language
4. Contents with both `p` and `la` override for platform+language combo

**Example**:
```json
{
  "contents": [
    {
      "message": "Default message",
      "title": "Default title"
    },
    {
      "p": "i",
      "message": "iOS-specific message"
    },
    {
      "la": "tr",
      "message": "Turkish message"
    },
    {
      "p": "i",
      "la": "tr",
      "message": "Turkish message for iOS"
    }
  ]
}
```

### Personalization

Personalization objects map string indexes to replacement definitions:

```json
{
  "messagePers": {
    "0": {
      "k": "first_name",
      "t": "c",
      "c": true,
      "f": "User"
    }
  }
}
```

- **Index `"0"`**: Replace from character 0 in message
- **`k`**: Property key (`first_name`)
- **`t`**: Type - `"u"` (user prop), `"c"` (custom prop), `"e"` (event data), `"a"` (API variable)
- **`c`**: Capitalize (true/false)
- **`f`**: Fallback value if property missing

Message: `" {first_name}, check this out!"` → `"John, check this out!"`

---

## Examples

### Example 1: Simple scheduled notification

**Description**: Send "Happy New Year!" to all iOS users on Dec 31, 2024 at 6 PM GMT+3

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/create" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "platforms": ["i"],
    "triggers": [{
      "kind": "plain",
      "start": "2024-12-31T18:00:00.000Z",
      "sctz": -180
    }],
    "contents": [{
      "message": "Happy New Year! 🎉",
      "title": "Celebration",
      "sound": "default",
      "badge": 1
    }],
    "info": {
      "title": "New Year Campaign"
    }
  }'
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "app": "507f1f77bcf86cd799439012",
  "platforms": ["i"],
  "status": "scheduled",
  "triggers": [{
    "kind": "plain",
    "start": "2024-12-31T18:00:00.000Z",
    "sctz": -180
  }],
  "contents": [{
    "message": "Happy New Year! 🎉",
    "title": "Celebration",
    "sound": "default",
    "badge": 1
  }],
  "info": {
    "title": "New Year Campaign",
    "created": "2024-12-15T10:30:00.000Z",
    "createdBy": "507f191e810c19729de860ea"
  }
}
```

### Example 2: Event-triggered notification with personalization

**Description**: Send personalized notification when users complete level 10

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/create" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "platforms": ["i", "a"],
    "triggers": [{
      "kind": "event",
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-12-31T23:59:59.000Z",
      "events": ["level_complete"],
      "delay": 300000,
      "cap": 1
    }],
    "contents": [{
      "message": " {first_name}, congrats on level 10!",
      "messagePers": {
        "0": {
          "k": "first_name",
          "t": "c",
          "c": true,
          "f": "Player"
        }
      },
      "title": "Achievement Unlocked!",
      "media": "https://cdn.example.com/level10.png",
      "mediaMime": "image/png",
      "url": "myapp://rewards"
    }],
    "filter": {
      "user": "{\\"custom.level\\": 10}"
    }
  }'
```

### Example 3: Draft notification

**Description**: Create draft for later editing

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/create" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "platforms": ["a"],
    "status": "draft",
    "triggers": [{
      "kind": "plain",
      "start": "2024-12-01T10:00:00.000Z"
    }],
    "contents": [{
      "message": "Draft message",
      "title": "Draft"
    }]
  }'
```

**Response** (200):
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "status": "draft",
  "app": "507f1f77bcf86cd799439012"
}
```

### Example 4: Multi-language, multi-platform notification

**Description**: Campaign with content variants for iOS/Android and English/Turkish

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/create" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "platforms": ["i", "a"],
    "triggers": [{
      "kind": "plain",
      "start": "2024-12-25T12:00:00.000Z"
    }],
    "contents": [
      {
        "message": "Merry Christmas!",
        "title": "Happy Holidays"
      },
      {
        "p": "i",
        "message": "Merry Christmas!",
        "title": "🎄 Happy Holidays",
        "specific": {
          "subtitle": "Special iOS subtitle"
        }
      },
      {
        "p": "a",
        "message": "Merry Christmas!",
        "specific": {
          "large_icon": "https://cdn.example.com/christmas_icon.png"
        }
      },
      {
        "la": "tr",
        "message": "Mutlu Noeller!",
        "title": "İyi Bayramlar"
      }
    ]
  }'
```

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `push_{app_id}` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `systemlogs` | Audit trail | Stores system action records read/written by this endpoint. |
| `apps` | Application metadata/config | Stores app-level settings and metadata read/updated by this endpoint. |
| `push_{credentials_id}` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `geos` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `cohorts` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `features.push.test.uids` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `features.push.test.cohorts` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `DEFAULTS.max_media_size` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Content length` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Media size` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Button count` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Personalization` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Triggers array` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Validation time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Database writes` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Scheduling` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Response time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message Update](./message-update.md) - Update campaign (draft or before first send)
- [Message Test](./message-test.md) - Test notification before creating campaign
- [Message Estimate](./message-estimate.md) - Estimate audience size before creating
- [Message Delete](./message-remove.md) - Delete campaign
- [Message Get](./message-get.md) - Retrieve campaign details
- [Message List](./message-all.md) - List all campaigns

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - message created | Complete message object |
| `400` | Missing required parameters | `{"kind": "ValidationError", "errors": [...]}` |
| `400` | Invalid platform | `{"kind": "ValidationError", "errors": ["Invalid platform"]}` |
| `400` | No push credentials | `{"kind": "ValidationError", "errors": ["No push credentials for iOS platform"]}` |
| `400` | Invalid trigger configuration | `{"kind": "ValidationError", "errors": ["start is required"]}` |
| `400` | Invalid filter (nonexistent geo/cohort) | `{"kind": "ValidationError", "errors": ["No such geo"]}` |
| `500` | Scheduling error | `{"errors": ["Error while scheduling the message: ..."]}` |
| `500` | Database error | `{"kind": "ServerError", "errors": ["Server error"]}` |

---

## Implementation Notes

1. **ID generation**: Uses MongoDB ObjectID for `_id`, ensuring uniqueness
2. **Timezone handling**: `sctz` is timezone offset in minutes (GMT+3 = -180)
3. **Date formats**: Accepts epoch milliseconds or ISO 8601 strings
4. **Content inheritance**: First content is default, subsequent override by platform/language
5. **Draft workflow**: Draft → Edit → Activate (set status to "active") → Schedule
6. **Approval workflow**: If Push Approver enabled, active messages go to "inactive" status
7. **Demo messages**: `demo: true` bypasses credential checks, useful for testing
8. **Audit trail**: Every create operation logged to systemlogs with full message JSON
9. **Personalization indexes**: String indexes map to character positions in message
10. **Filter combination**: user, drill, geos, cohorts filters are AND-ed together

## Last Updated

February 2026
