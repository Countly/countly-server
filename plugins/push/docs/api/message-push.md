---
sidebar_label: "Send"
---

# /i/push/message/push

## Overview

Trigger an API-based push notification campaign by creating a schedule with custom filter and content overrides. Used for transactional push notifications where the message was created with an API trigger but needs to be sent with dynamic targeting and content. Only works for campaigns with `triggers.kind="api"`.

**Related Endpoints**:
- [Message Create](./message-create.md) - Create API-triggered campaign
- [Message Update](./message-update.md) - Update campaign configuration

---

## Endpoint


```plaintext
/i/push/message/push
```

## Authentication

- **Required Permission**: Create access to `push` feature (`validateCreate`)
- **HTTP Methods**: POST recommended (all methods supported)
- **Content-Type**: application/x-www-form-urlencoded or JSON

**HTTP Method Flexibility:**  
All Countly endpoints accept any HTTP method (GET, POST, PUT, DELETE) interchangeably.

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API authentication key |
| `app_id` | String | Yes | Application ID |
| `_id` | ObjectID | Yes | Message ID (campaign with API trigger) |
| `start` | Timestamp | Yes | Send timestamp (milliseconds, must be ≥ triggers.start) |
| `filter` | Object | Yes | User filter (see Filter Structure below) |
| `contents` | Object | No | Content overrides (see Contents Structure below) |
| `variables` | Object | No | Personalization variables for content substitution |

**Parameter Constraints**:
- **`_id`**: Message must exist and have `triggers.kind="api"`
- **`start`**: Must be ≥ message's `triggers.start` timestamp
- **`filter`**: Required, defines target audience for this send
- **`contents`**: Optional, overrides default campaign content
- **`variables`**: Optional, provides personalization values

### Filter Structure

Same structure as in [Message Create](./message-create.md#filter-structure):

```json
{
  "user": {
    "and": [
      {"sg.app_version": {"$in": ["2.0", "2.1"]}},
      {"sg.country": {"$eq": "US"}},
      {"up.premium": {"$eq": true}}
    ]
  },
  "drill": {
    "queryObject": {
      "chr.platform": {"$in": ["Android", "iOS"]}
    }
  }
}
```

**Filter Fields**:
- **`user`**: Filters on user properties, segments (cohorts), push tokens
- **`drill`**: Filters on drill database (events, sessions)

### Contents Structure

Optional content overrides. Same structure as in [Message Create](./message-create.md#contents-structure):

```json
{
  "default": {
    "title": "Transaction Complete",
    "message": "Your order %0% has been shipped!",
    "badge": "1",
    "sound": "default",
    "data": {
      "orderId": "%0%"
    }
  },
  "i|es": {
    "title": "Transacción Completada",
    "message": "¡Tu pedido %0% ha sido enviado!"
  }
}
```

**Content Fields**:
- **Key**: `"default"` or platform+locale (e.g., `"i|es"`, `"a|fr"`)
- **Value**: Content object with title, message, badge, sound, buttons, media, etc.

### Variables Structure

Personalization variables for content substitution:

```json
{
  "0": "ORD-12345",
  "1": "December 15",
  "customField": "value"
}
```

**Usage**:
- Variables replace placeholders in content: `%0%`, `%1%`, etc.
- Can also use named variables: `%customField%`

## Response

#### Success Response - Schedule Created
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{}
```

**Note**: Returns empty object on success. Schedule created in `message_schedules` collection.

#### Error Response - Message Not Found
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "kind": "PushError",
  "code": 400,
  "message": "Message not found"
}
```

#### Error Response - Not API-Triggered
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "kind": "PushError",
  "code": 400,
  "message": "Message must have API trigger"
}
```

#### Error Response - Invalid Start Time
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "kind": "ValidationError",
  "errors": ["start must be greater than or equal to triggers.start"]
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
    "filter is required"
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
   - Validates required parameters: `_id`, `start`, `filter`
   - Validates ObjectID format for `_id`
   - Validates `start` is numeric timestamp
   - Returns 400 if validation fails

2. **Message Lookup**
   - Queries `messages` collection for message with `_id`
   - Returns 400 if message not found
   - Returns 400 if `triggers.kind` ≠ `"api"`

3. **Start Time Validation**
   - Checks `start` ≥ `message.triggers.start`
   - Returns 400 if start time is before trigger start
   - Allows future start times (scheduled send)

4. **Schedule Creation**
   - Creates new document in `message_schedules` collection
   - Schedule document includes:
     - `messageId`: Campaign ID
     - `scheduledTo`: Send timestamp
     - `filter`: User targeting criteria
     - `contents`: Content overrides (if provided)
     - `variables`: Personalization variables (if provided)
     - `status`: "pending"
     - `created`: Current timestamp

5. **Job Scheduling**
   - Creates background job to process schedule
   - Job runs at `scheduledTo` timestamp
   - Job evaluates filter, sends notifications to matching users

6. **Response**
   - Returns empty object `{}` on success
   - Schedule ID not returned (query `message_schedules` to find it)

### API Trigger Requirements

**Campaign Configuration**:
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "triggers": {
    "kind": "api",
    "start": 1702800000000,
    "end": 1735660800000
  }
}
```

**Requirements**:
- **`triggers.kind`**: Must be `"api"`
- **`triggers.start`**: Earliest allowed send time
- **`triggers.end`**: Latest allowed send time (optional)

**Why API Trigger Required**:
- API-triggered campaigns have no automatic send schedule
- They require explicit API calls to create send schedules
- Other trigger types (plain, event, cohort) send automatically

### Schedule Document Structure

Created in `message_schedules` collection:

```javascript
{
  _id: ObjectId("..."),
  messageId: ObjectId("507f1f77bcf86cd799439011"),
  scheduledTo: 1702845234567,
  status: "pending",
  created: 1702845000000,
  filter: {
    user: {
      and: [
        {"sg.country": {"$eq": "US"}}
      ]
    }
  },
  contents: {
    default: {
      title: "Your order is ready!",
      message: "Order %0% shipped"
    }
  },
  variables: {
    "0": "ORD-12345"
  }
}
```

**Fields**:
- **`messageId`**: Reference to parent campaign
- **`scheduledTo`**: Unix timestamp when to send
- **`status`**: "pending", "sending", "sent", "cancelled"
- **`filter`**: User targeting (overrides campaign filter)
- **`contents`**: Content overrides (merged with campaign contents)
- **`variables`**: Personalization variables

### Content Override Behavior

**Merging Logic**:
1. Start with campaign's default `contents`
2. Apply `contents` parameter overrides
3. Substitute variables: Replace `%0%`, `%1%`, etc. with variable values

**Example**:
```javascript
// Campaign contents
contents: {
  default: {
    title: "Notification",
    message: "Message text",
    sound: "default"
  }
}

// Override contents in push call
contents: {
  default: {
    title: "Order Update",
    message: "Order %0% shipped"
  }
}

// Resulting merged contents
{
  default: {
    title: "Order Update",
    message: "Order ORD-12345 shipped",  // %0% replaced
    sound: "default"  // Inherited from campaign
  }
}
```

### Filter Override Behavior

**Complete Replacement**:
- Campaign's `filter` is ignored
- Only schedule's `filter` is used
- No merging or inheritance

**Use Case**:
- Campaign has broad filter (e.g., all users with push tokens)
- Each API push uses specific filter (e.g., user with order ID)

### Start Time Constraints

**Validation Rules**:
```javascript
// start must be >= triggers.start
if (start < message.triggers.start) {
  throw new ValidationError("start too early");
}

// start should be <= triggers.end (if end defined)
if (message.triggers.end && start > message.triggers.end) {
  // Warning or error (implementation-dependent)
}
```

**Immediate Send**:
- Set `start` to current timestamp or slightly in future (e.g., `Date.now() + 60000`)
- Schedule processed within 1 minute

**Scheduled Send**:
- Set `start` to future timestamp
- Schedule processed at exact timestamp (within 1-minute precision)

### Variables and Personalization

**Supported Formats**:
- **Index-based**: `%0%`, `%1%`, `%2%`, ... (unlimited)
- **Named**: `%variableName%` (any alphanumeric key)

**Variable Sources**:
1. **API call**: `variables` parameter (highest priority)
2. **User properties**: Fetched from user document (lower priority)

**Example**:
```json
// Call with variables
{
  "contents": {
    "default": {
      "message": "Hi %userName%, your order %0% shipped on %1%"
    }
  },
  "variables": {
    "0": "ORD-12345",
    "1": "Dec 15",
    "userName": "John"
  }
}

// Resulting message (sent to user)
// "Hi John, your order ORD-12345 shipped on Dec 15"
```

---

## Examples

### Example 1: Simple transactional push (immediate send)

**Description**: Send order confirmation to specific user

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/push" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011",
    "start": 1702845000000,
    "filter": {
      "user": {
        "and": [
          {"uid": {"$eq": "user12345"}}
        ]
      }
    },
    "contents": {
      "default": {
        "title": "Order Confirmed",
        "message": "Your order ORD-12345 has been confirmed!",
        "sound": "default",
        "data": {
          "orderId": "ORD-12345",
          "action": "view_order"
        }
      }
    }
  }'
```

**Response** (200):
```json
{}
```

### Example 2: Personalized push with variables

**Description**: Send shipping notification with order details

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/push" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011",
    "start": 1702845000000,
    "filter": {
      "user": {
        "and": [
          {"uid": {"$eq": "user67890"}}
        ]
      }
    },
    "contents": {
      "default": {
        "title": "Package Shipped",
        "message": "Order %0% shipped! Expected delivery: %1%",
        "sound": "default"
      }
    },
    "variables": {
      "0": "ORD-67890",
      "1": "December 18"
    }
  }'
```

**Response** (200):
```json
{}
```

### Example 3: Scheduled push (future send)

**Description**: Schedule reminder notification for 1 hour later

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/push" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011",
    "start": 1702848600000,
    "filter": {
      "user": {
        "and": [
          {"up.cart_abandoned": {"$eq": true}},
          {"sg.country": {"$eq": "US"}}
        ]
      }
    },
    "contents": {
      "default": {
        "title": "Cart Reminder",
        "message": "You have items waiting in your cart!",
        "sound": "default"
      }
    }
  }'
```

**Response** (200):
```json
{}
```

### Example 4: Multi-user targeting

**Description**: Send cohort-based promotion

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/push" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439022",
    "start": 1702845000000,
    "filter": {
      "user": {
        "and": [
          {"cohorts": {"$in": ["507f1f77bcf86cd799439050"]}},
          {"sg.app_version": {"$gte": "2.0"}}
        ]
      }
    },
    "contents": {
      "default": {
        "title": "Exclusive Offer",
        "message": "Premium members: 50% off today only!",
        "sound": "default",
        "data": {
          "promo_code": "PREMIUM50"
        }
      }
    }
  }'
```

**Response** (200):
```json
{}
```

### Example 5: Localized content with platform overrides

**Description**: Send with Spanish iOS variant

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/push" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011",
    "start": 1702845000000,
    "filter": {
      "user": {
        "and": [
          {"sg.language": {"$eq": "es"}},
          {"tkip": {"$exists": true}}
        ]
      }
    },
    "contents": {
      "default": {
        "title": "Notification",
        "message": "Default English message"
      },
      "i|es": {
        "title": "Notificación",
        "message": "Mensaje en español"
      }
    }
  }'
```

**Response** (200):
```json
{}
```

### Example 6: Error - start time too early

**Description**: Start time before campaign's trigger.start

**Request** (POST):
```bash
curl -X POST "https://your-server.com/i/push/message/push" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app_id": "507f1f77bcf86cd799439012",
    "_id": "507f1f77bcf86cd799439011",
    "start": 1702700000000,
    "filter": {
      "user": {"and": [{"uid": {"$eq": "user12345"}}]}
    }
  }'
```

**Response** (400):
```json
{
  "kind": "ValidationError",
  "errors": ["start must be greater than or equal to triggers.start"]
}
```

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `messages` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `message_schedules` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Schedule precision` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Max future scheduling` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Past scheduling` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No schedule ID return` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No batch API` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No update/cancel` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Single message` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Filter complexity` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `API response time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Send processing` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Throughput` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Job processing` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message Create](./message-create.md) - Create API-triggered campaign
- [Message Update](./message-update.md) - Update campaign settings
- [Message Get](./message-get.md) - Retrieve campaign details

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - schedule created | `{}` (empty object) |
| `400` | Missing required parameters | `{"kind": "ValidationError", "errors": ["_id is required"]}` |
| `400` | Message not found | `{"kind": "PushError", "message": "Message not found"}` |
| `400` | Not API-triggered campaign | `{"kind": "PushError", "message": "Message must have API trigger"}` |
| `400` | Start time too early | `{"kind": "ValidationError", "errors": ["start too early"]}` |
| `400` | Invalid ObjectID format | `{"kind": "ValidationError", "errors": ["_id must be ObjectID"]}` |
| `400` | Invalid filter format | `{"kind": "ValidationError", "errors": ["filter must be object"]}` |
| `500` | Database error | `{"kind": "ServerError", "errors": ["Server error"]}` |

---

## Implementation Notes

1. **API trigger requirement**: Only works with `triggers.kind="api"` campaigns
2. **Filter override**: Schedule filter completely replaces campaign filter (no merge)
3. **Content merge**: Schedule contents merged with campaign contents (field-level override)
4. **Variable substitution**: Occurs during send processing, not schedule creation
5. **Schedule document**: Created immediately, processed asynchronously
6. **Start time validation**: Must be ≥ `triggers.start`, recommended ≥ current time
7. **No idempotency**: Multiple calls create multiple schedules (no deduplication)
8. **No return schedule ID**: Response is empty object (query database to find schedule)
9. **Job scheduling**: Uses Countly job framework (1-minute granularity)
10. **Platform selection**: Determined by user's available tokens, not specified in call
11. **Locale selection**: Automatic based on user's language setting
12. **Future scheduling**: Supports scheduling days/weeks in advance (within campaign window)

## Last Updated

February 2026
