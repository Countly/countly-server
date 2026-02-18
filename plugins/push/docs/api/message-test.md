---
sidebar_label: "Message Test"
---

# /i/push/message/test

## Overview

Send test push notifications to configured test users or cohorts without creating a campaign or saving to the database. Useful for testing notification content, platform-specific rendering, personalization, and media attachments before launching a full campaign.

**Related Endpoints**:
- [Message Create](./message-create.md) - Create campaign after testing
- [Message Estimate](./message-estimate.md) - Estimate audience reach
- [MIME Info](./mime.md) - Check media attachment MIME type

---

## Endpoint


```plaintext
/i/push/message/test
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
| `test` | Boolean | Yes | Must be `true` to indicate test mode |
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
| `userConditions` | Object | No | Additional test user filtering (MongoDB query) |

## Response

#### Success Response - Test Sent
**Status Code**: `200 OK`

**Body**: Send results for test users/cohorts

### Success Response

```json
{
  "sent": 5,
  "failed": 0,
  "result": {
    "uids": ["user1", "user2", "user3"],
    "cohorts": ["premium_users"],
    "total": 5,
    "processed": 5,
    "sent": 5,
    "failed": 0,
    "errors": []
  }
}
```

#### Success Response - No Test Users
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "kind": "ValidationError",
  "errors": [
    "Test users/cohorts not set for this app"
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
    "platforms is required",
    "contents is required",
    "test must be true"
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
   - Verifies `test` parameter is `true`
   - Validates all required fields (`platforms`, `contents`)
   - Validates content structure (message, title, etc.)

2. **Test Configuration Loading**
   - Reads `apps[app_id].features.push.test.uids` (comma-separated user IDs)
   - Reads `apps[app_id].features.push.test.cohorts` (comma-separated cohort IDs)
   - If both empty: Returns ValidationError "Test users/cohorts not set"

3. **Credentials Verification**
   - Checks `apps.features.push.{platform}._id` exists for each platform
   - Queries `push_{credentials_id}` collection to verify credentials exist
   - Rejects if credentials missing or set to 'demo'

4. **Test Audience Selection**
   - **From UIDs**: Queries `app_users{APP_ID}` collection with `uid` in configured UIDs
   - **From Cohorts**: Queries `app_users{APP_ID}` collection with cohort membership
   - Applies `userConditions` filter if provided (additional MongoDB query)
   - Filters users who have push tokens for requested platforms

5. **Personalization Processing**
   - For each user, processes personalization placeholders
   - Replaces placeholders with user property values
   - Applies fallback values if properties missing
   - Capitalizes if configured

6. **Notification Sending**
   - Creates in-memory temporary message object (not saved to DB)
   - Sends notifications immediately via push queue
   - Tracks send results (sent, failed, errors)

7. **Response**
   - Returns send statistics and user/cohort info
   - Includes any errors encountered during send

### Test User Configuration

Test users/cohorts are configured in the `apps` collection:

```javascript
// In apps collection document:
{
  "_id": "507f1f77bcf86cd799439012",
  "features": {
    "push": {
      "test": {
        "uids": "user123,user456,user789",  // Comma-separated
        "cohorts": "cohort1,cohort2"        // Comma-separated
      }
    }
  }
}
```

**Setting via App Management API**:
```bash
curl -X POST "https://your-server.com/i/apps/update" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "features.push.test.uids=user123,user456" \
  -d "features.push.test.cohorts=premium_users"
```

### Platform Selection

The test endpoint sends to users who have tokens for the specified platforms:
- **iOS** (`i`): Users with `tkip` (production) or `tkid` (development) tokens
- **Android** (`a`): Users with `tkap` (production) or `tkad` (development) tokens
- **Web** (`w`): Users with `tkwp` tokens
- **Huawei** (`h`): Users with `tkhp` tokens

If a test user doesn't have a token for the requested platform, they won't receive the notification.

### Content Structure

Content objects follow the same structure as [Message Create](./message-create.md):

1. First content (index 0) has no `p` or `la` - serves as default
2. Subsequent contents with `p` override default for specific platform
3. Contents with `la` override for specific language
4. Contents with both `p` and `la` override for platform+language combo

**Example**:
```json
{
  "contents": [
    {
      "message": "Default test message",
      "title": "Test"
    },
    {
      "p": "i",
      "message": "iOS-specific test message"
    },
    {
      "la": "tr",
      "message": "Türkçe test mesajı"
    }
  ]
}
```

### Personalization

Personalization works identically to [Message Create](./message-create.md):

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

Message: `" {first_name}, this is a test!"` → `"John, this is a test!"`

### User Conditions Filter

The optional `userConditions` parameter allows additional filtering of test users:

```json
{
  "userConditions": {
    "country": "US",
    "custom.premium": true
  }
}
```

This MongoDB query is AND-ed with the test user/cohort selection, so only test users matching the conditions will receive the test notification.

---

## Examples

### Example 1: Simple test notification

**Description**: Send test notification to configured test users

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/test" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "platforms": ["i", "a"],
    "test": true,
    "contents": [{
      "message": "This is a test notification",
      "title": "Test",
      "sound": "default"
    }]
  }'
```

**Response** (200):
```json
{
  "sent": 3,
  "failed": 0,
  "result": {
    "uids": ["user123", "user456", "user789"],
    "cohorts": [],
    "total": 3,
    "processed": 3,
    "sent": 3,
    "failed": 0,
    "errors": []
  }
}
```

### Example 2: Test with personalization

**Description**: Test personalized notification content

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/test" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "platforms": ["i"],
    "test": true,
    "contents": [{
      "message": " {first_name}, your order is ready!",
      "messagePers": {
        "0": {
          "k": "first_name",
          "t": "c",
          "c": true,
          "f": "Customer"
        }
      },
      "title": "Order Update",
      "url": "myapp://orders/12345"
    }]
  }'
```

**Response** (200):
```json
{
  "sent": 2,
  "failed": 0,
  "result": {
    "uids": ["user123", "user456"],
    "cohorts": [],
    "total": 2,
    "processed": 2,
    "sent": 2,
    "failed": 0,
    "errors": []
  }
}
```

### Example 3: Test with media attachment

**Description**: Test notification with image attachment

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/test" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "platforms": ["i", "a"],
    "test": true,
    "contents": [{
      "message": "Check out this amazing photo!",
      "title": "New Content",
      "media": "https://cdn.example.com/photo.jpg",
      "mediaMime": "image/jpeg",
      "url": "https://example.com/gallery"
    }]
  }'
```

**Response** (200):
```json
{
  "sent": 5,
  "failed": 0,
  "result": {
    "uids": ["user123", "user456"],
    "cohorts": ["premium_users"],
    "total": 5,
    "processed": 5,
    "sent": 5,
    "failed": 0,
    "errors": []
  }
}
```

### Example 4: Test with platform-specific content

**Description**: Test different content for iOS vs Android

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/test" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "platforms": ["i", "a"],
    "test": true,
    "contents": [
      {
        "message": "Default message",
        "title": "Test"
      },
      {
        "p": "i",
        "message": "iOS-specific message",
        "specific": {
          "subtitle": "iOS subtitle"
        }
      },
      {
        "p": "a",
        "message": "Android-specific message",
        "specific": {
          "large_icon": "https://cdn.example.com/icon.png"
        }
      }
    ]
  }'
```

**Response** (200):
```json
{
  "sent": 4,
  "failed": 0,
  "result": {
    "uids": ["user123", "user456", "user789"],
    "cohorts": [],
    "total": 4,
    "processed": 4,
    "sent": 4,
    "failed": 0,
    "errors": []
  }
}
```

### Example 5: Test with user conditions filter

**Description**: Test only with premium users from US

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/test" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "platforms": ["i", "a"],
    "test": true,
    "contents": [{
      "message": "Exclusive offer for premium members!",
      "title": "Premium Deal"
    }],
    "userConditions": {
      "country": "US",
      "custom.premium": true
    }
  }'
```

**Response** (200):
```json
{
  "sent": 1,
  "failed": 0,
  "result": {
    "uids": ["user456"],
    "cohorts": [],
    "total": 1,
    "processed": 1,
    "sent": 1,
    "failed": 0,
    "errors": []
  }
}
```

### Example 6: Test with action buttons

**Description**: Test notification with interactive buttons

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/test" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "platforms": ["i", "a"],
    "test": true,
    "contents": [{
      "message": "You have a new message",
      "title": "New Message",
      "buttons": [
        {
          "title": "Reply",
          "url": "myapp://reply"
        },
        {
          "title": "View",
          "url": "myapp://view"
        }
      ]
    }]
  }'
```

**Response** (200):
```json
{
  "sent": 3,
  "failed": 0,
  "result": {
    "uids": ["user123", "user456", "user789"],
    "cohorts": [],
    "total": 3,
    "processed": 3,
    "sent": 3,
    "failed": 0,
    "errors": []
  }
}
```

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `Platform` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `iOS` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Android` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Web` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Huawei` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Feature` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Database save` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Campaign creation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Audience` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Triggers` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Analytics` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Approval flow` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `System logs` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Scheduling` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `apps` | Application metadata/config | Stores app-level settings and metadata read/updated by this endpoint. |
| `app_users{APP_ID}` | Per-app user profiles | Stores user-level profile fields read or modified by this endpoint. |
| `push_{credentials_id}` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `cohorts` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `apps[app_id].features.push.test.uids` | Application metadata/config | Stores app-level settings and metadata read/updated by this endpoint. |
| `apps[app_id].features.push.test.cohorts` | Application metadata/config | Stores app-level settings and metadata read/updated by this endpoint. |
| `DEFAULTS.max_media_size` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Test users` | User/member aggregates | Stores user and member records used by this endpoint. |
| `Content length` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Media size` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Button count` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Send limit` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No database save` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No scheduling` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No tracking` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Validation time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `User query time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Send time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Response time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message Create](./message-create.md) - Create campaign after successful test
- [Message Estimate](./message-estimate.md) - Estimate full campaign audience
- [MIME Info](./mime.md) - Verify media attachment MIME type
- [Message Update](./message-update.md) - Update existing campaign
- [Dashboard](./dashboard.md) - View push statistics

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - test sent | Send results with counts |
| `400` | Test parameter not true | `{"kind": "ValidationError", "errors": ["test must be true"]}` |
| `400` | Missing required parameters | `{"kind": "ValidationError", "errors": ["platforms is required"]}` |
| `400` | No test users configured | `{"kind": "ValidationError", "errors": ["Test users/cohorts not set for this app"]}` |
| `400` | No push credentials | `{"kind": "ValidationError", "errors": ["No push credentials for iOS platform"]}` |
| `400` | Invalid platform | `{"kind": "ValidationError", "errors": ["Invalid platform: x"]}` |
| `400` | Invalid content structure | `{"kind": "ValidationError", "errors": ["message is required in contents[0]"]}` |
| `500` | Send error | `{"kind": "PushError", "errors": ["Error sending test: ..."]}` |
| `500` | Database error | `{"kind": "ServerError", "errors": ["Server error"]}` |

---

## Implementation Notes

1. **No persistence**: Test endpoint creates temporary message object, never saves to DB
2. **Immediate send**: Notifications are queued immediately, no scheduling
3. **Test-only audience**: Only users/cohorts configured in app settings receive notifications
4. **Token filtering**: Only sends to users with tokens for requested platforms
5. **Personalization**: Fully processes personalization for each test user
6. **User conditions**: Optional additional filtering on top of test user/cohort selection
7. **No approval**: Bypasses Push Approver feature (if enabled)
8. **No analytics**: Does not create full analytics tracking (only basic sent/failed counts)
9. **Credentials check**: Still requires valid push credentials for requested platforms
10. **Response timing**: Returns immediately after queuing, doesn't wait for actual delivery
11. **Testing workflow**: Test → Verify → Create campaign with [Message Create](./message-create.md)
12. **Multi-platform**: Can test multiple platforms simultaneously

## Last Updated

February 2026
