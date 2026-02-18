---
sidebar_label: "Read History"
---

# /o/push/user

## Overview

Retrieve push notification history for a specific user. Returns all notifications sent to the user, with optional message details. Useful for user support, debugging push issues, and viewing per-user notification history.

**Related Endpoints**:
- [Message Get](./message-get.md) - Get campaign details
- [Message Stats](./message-stats.md) - Periodic statistics for campaigns

---

## Endpoint


```plaintext
/o/push/user
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
| `app_id` | String | Yes | Application ID |
| `id` | String | Conditional | User ID (uid), required if `did` not provided |
| `did` | String | Conditional | Device ID, required if `id` not provided |
| `messages` | BooleanString | Yes | Whether to include message objects (`"true"` or `"false"`) |

**User Identification**:
- Must provide either `id` (user ID/uid) or `did` (device ID)
- If `did` provided, endpoint looks up `uid` from `app_users{app_id}` collection
- If user not found by `did`, returns 404 error

**"messages" Parameter**:
- `"true"`: Returns both `notifications` (send timestamps) and `messages` (campaign objects)
- `"false"`: Returns only `notifications` (send timestamps)

## Response

#### Success Response - User Has Notifications (with messages)
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "notifications": {
    "507f1f77bcf86cd799439011": 1702845234567,
    "507f1f77bcf86cd799439022": 1702931634567,
    "507f1f77bcf86cd799439033": 1703018034567
  },
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "app": "507f1f77bcf86cd799439012",
      "type": "message",
      "status": "sent",
      "created": 1702800000000,
      "contents": {
        "default": {
          "title": "Welcome!",
          "message": "Thanks for joining our app",
          "badge": "1",
          "sound": "default"
        }
      },
      "platforms": ["i", "a"],
      "triggers": {
        "kind": "plain",
        "start": 1702810000000
      },
      "result": {
        "status": 7,
        "total": 15234,
        "processed": 15234,
        "sent": 14823,
        "errors": 411
      }
    },
    {
      "_id": "507f1f77bcf86cd799439022",
      "app": "507f1f77bcf86cd799439012",
      "type": "message",
      "status": "active",
      "created": 1702900000000,
      "contents": {
        "default": {
          "title": "Daily Update",
          "message": "Check out what's new today!",
          "sound": "default"
        }
      },
      "platforms": ["i"],
      "triggers": {
        "kind": "recurring",
        "start": 1702910000000,
        "end": 1735660800000,
        "delay": 86400000,
        "time": "09:00"
      }
    }
  ]
}
```

**Response Structure**:
- **`notifications`** (Object): Map of message IDs to Unix timestamps (milliseconds)
  - **Key** (String): Message ID (ObjectID as string)
  - **Value** (Number): Timestamp when notification was sent to user
- **`messages`** (Array[Object]): Array of full message objects (only if `messages=true`)
  - Contains complete campaign documents from `messages` collection

#### Success Response - User Has Notifications (without messages)
**Status Code**: `200 OK`

**Body**:
```json
{
  "notifications": {
    "507f1f77bcf86cd799439011": 1702845234567,
    "507f1f77bcf86cd799439022": 1702931634567
  }
}
```

#### Success Response - User Has No Notifications
**Status Code**: `200 OK`

**Body**:
```json
{}
```

**Note**: Returns empty object when:
- User not found in `push_{app_id}` collection
- User exists but has empty `msgs` object
- User exists but has no `msgs` field

#### Error Response - Missing User Identifier
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "errors": ["One of id & did parameters is required"]
}
```

#### Error Response - Device ID Not Found
**Status Code**: `404 Not Found`

**Body**:
```json
{
  "errors": ["User with the did specified is not found"]
}
```

#### Error Response - Validation Error
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "errors": [
    "app_id is required",
    "messages is required"
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
   - Validates required parameters: `app_id`, `messages`
   - Validates that `id` or `did` is provided
   - Returns 400 if validation fails

2. **User ID Resolution** (if `did` provided)
   - Queries `app_users{app_id}` collection for device ID
   - Extracts `uid` from user document
   - Returns 404 if user not found

3. **Push Data Lookup**
   - Queries `push_{app_id}` collection for user push data
   - Document ID: `uid` (user ID)
   - Returns empty object if user has no push data

4. **Message IDs Extraction**
   - Extracts message IDs from `push.msgs` object keys
   - Returns empty object if no messages sent to user

5. **Message Details Lookup** (if `messages=true`)
   - Queries `messages` collection for all message IDs
   - Converts message ID strings to ObjectIDs
   - Includes full message documents in response

6. **Response Assembly**
   - Always includes `notifications` object
   - Conditionally includes `messages` array
   - Returns combined response

### User Push Data Structure

The `push_{app_id}` collection stores per-user push data:

**Document Schema**:
```javascript
{
  _id: "user123",  // User ID (uid)
  msgs: {
    "507f1f77bcf86cd799439011": 1702845234567,  // messageId: sentTimestamp
    "507f1f77bcf86cd799439022": 1702931634567
  },
  tk: {
    // Token data (not returned by this endpoint)
  }
}
```

**Fields**:
- **`_id`** (String): User ID (uid)
- **`msgs`** (Object): Map of message IDs to send timestamps
  - **Key**: Message ID (ObjectID as string)
  - **Value**: Unix timestamp in milliseconds when notification sent

### Message Lookup Logic

When `messages=true`:
1. Extract all message IDs from `push.msgs` object keys
2. Convert string IDs to ObjectID format
3. Query `messages` collection: `{_id: {$in: [ObjectIDs]}}`
4. Return matching message documents

**Note**: If a message was deleted, it won't appear in `messages` array but will still appear in `notifications` map.

### User Identification Methods

**Option 1: User ID (uid)**
```javascript
// Direct lookup in push_{app_id} collection
let push = await db.collection(`push_${app_id}`).findOne({_id: uid});
```

**Option 2: Device ID (did)**
```javascript
// Step 1: Resolve device ID to user ID
let user = await db.collection(`app_users${app_id}`).findOne({did: did});
let uid = user.uid;

// Step 2: Lookup push data
let push = await db.collection(`push_${app_id}`).findOne({_id: uid});
```

### Empty Response Cases

Returns empty object `{}` when:
- User ID not found in `push_{app_id}` collection
- User document exists but `msgs` field is null/undefined
- User document exists but `msgs` object is empty

These cases are not errors - they indicate user has no push history.

### Message Objects

Message objects returned (when `messages=true`) are standard campaign documents:
- See [Message Get](./message-get.md) for complete message structure
- Includes: contents, platforms, triggers, filter, result, info, etc.
- May include deleted messages if user was sent notification before deletion

---

## Examples

### Example 1: Get notifications with message details (by user ID)

**Description**: Retrieve user's notification history with full campaign details

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/user" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "id=user12345" \
  -d "messages=true"
```

**Response** (200):
```json
{
  "notifications": {
    "507f1f77bcf86cd799439011": 1702845234567,
    "507f1f77bcf86cd799439022": 1702931634567
  },
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "app": "507f1f77bcf86cd799439012",
      "type": "message",
      "status": "sent",
      "created": 1702800000000,
      "contents": {
        "default": {
          "title": "Flash Sale!",
          "message": "50% off today only",
          "sound": "default"
        }
      },
      "platforms": ["i", "a"],
      "triggers": {
        "kind": "plain",
        "start": 1702810000000
      }
    },
    {
      "_id": "507f1f77bcf86cd799439022",
      "app": "507f1f77bcf86cd799439012",
      "type": "message",
      "status": "active",
      "created": 1702900000000,
      "contents": {
        "default": {
          "title": "Daily Reminder",
          "message": "Complete your profile",
          "sound": "default"
        }
      },
      "platforms": ["i"],
      "triggers": {
        "kind": "recurring",
        "start": 1702910000000,
        "delay": 86400000,
        "time": "10:00"
      }
    }
  ]
}
```

### Example 2: Get notifications only (no message details)

**Description**: Retrieve notification timestamps without full campaign data

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/user" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "id=user12345" \
  -d "messages=false"
```

**Response** (200):
```json
{
  "notifications": {
    "507f1f77bcf86cd799439011": 1702845234567,
    "507f1f77bcf86cd799439022": 1702931634567,
    "507f1f77bcf86cd799439033": 1703018034567
  }
}
```

### Example 3: Lookup by device ID

**Description**: Retrieve notifications using device ID instead of user ID

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/user" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "did=abc123def456" \
  -d "messages=true"
```

**Response** (200):
```json
{
  "notifications": {
    "507f1f77bcf86cd799439011": 1702845234567
  },
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "app": "507f1f77bcf86cd799439012",
      "status": "sent",
      "contents": {
        "default": {
          "title": "Welcome!",
          "message": "Thanks for installing our app"
        }
      },
      "platforms": ["a"],
      "triggers": {"kind": "plain"}
    }
  ]
}
```

### Example 4: User with no notifications

**Description**: User exists but has no push notification history

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/user" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "id=newuser789" \
  -d "messages=true"
```

**Response** (200):
```json
{}
```

### Example 5: Device ID not found

**Description**: Device ID doesn't exist in app_users collection

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/user" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "did=nonexistent123" \
  -d "messages=true"
```

**Response** (404):
```json
{
  "errors": ["User with the did specified is not found"]
}
```

### Example 6: Missing user identifier

**Description**: Neither id nor did provided

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/user" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "messages=true"
```

**Response** (400):
```json
{
  "errors": ["One of id & did parameters is required"]
}
```

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `app_users{app_id}` | Per-app user profiles | Stores user-level profile fields read or modified by this endpoint. |
| `push_{app_id}` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `messages` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `notifications object` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `messages array` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `Use case` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `User ID field` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Device ID field` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No pagination` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No filtering` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No sorting` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Large history` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `User lookup (by uid)` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `User lookup (by did)` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Message lookup` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Typical response time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message Get](./message-get.md) - Get campaign details
- [Message Stats](./message-stats.md) - Time-series statistics for campaigns
- [Message List](./message-all.md) - List all campaigns

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - user has notifications | `{notifications: {...}, messages: [...]}` |
| `200` | Success - user has no notifications | `{}` (empty object) |
| `400` | Missing id and did parameters | `{"errors": ["One of id & did parameters is required"]}` |
| `400` | Missing required parameters | `{"errors": ["app_id is required", "messages is required"]}` |
| `400` | Invalid parameter format | `{"errors": ["messages must be boolean string"]}` |
| `404` | Device ID not found | `{"errors": ["User with the did specified is not found"]}` |
| `500` | Database error | `{"kind": "ServerError", "errors": ["Server error"]}` |

---

## Implementation Notes

1. **User ID priority**: If both `id` and `did` provided, `id` takes precedence
2. **Device ID resolution**: Requires additional database query to `app_users{app_id}`
3. **Empty msgs**: User document may exist in `push_{app_id}` with empty `msgs` object
4. **Message lookup**: Uses `$in` operator to fetch all messages in single query
5. **ObjectID conversion**: Converts message ID strings to ObjectID format for query
6. **Array order**: Messages returned in arbitrary order (based on database cursor)
7. **Deleted messages**: May appear in response if user was sent before deletion
8. **No token data**: Endpoint doesn't return user's push tokens (use separate API)
9. **BooleanString type**: `messages` parameter must be string `"true"` or `"false"`
10. **No count limit**: Returns all notifications (can be large for active users)
11. **Empty response**: Returns `{}` (not `{notifications: {}}`) when user has no data
12. **Timestamp precision**: Millisecond precision maintained in response

## Last Updated

February 2026
