---
sidebar_label: "Read Metrics"
---

# /o/push/dashboard

## Overview

Retrieve comprehensive push notification metrics for dashboard display. Provides sent/actioned statistics across all campaigns, broken down by time period (weekly/monthly/daily), automated vs transactional, and per-platform. Also includes enabled user counts, push token distribution, and Kafka availability status.

**Related Endpoints**:
- [Message Stats](./message-stats.md) - Per-campaign time-series statistics
- [Message List](./message-all.md) - List all campaigns with stats
- [Message Get](./message-get.md) - Single campaign details

---

## Endpoint


```plaintext
/o/push/dashboard
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

## Response

#### Success Response - Dashboard Metrics
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "kafkaStatus": {
    "available": true,
    "error": null
  },
  "sent": {
    "weekly": {
      "data": [523, 841, 612, 1023, 745, 892, 1156, 923, 734, 1245, 867, 1034],
      "keys": [48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7]
    },
    "monthly": {
      "data": [15234, 18423, 21567, 19234, 22456, 25890, 23123, 24567, 26890, 28123, 29456, 31234],
      "keys": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    "total": 285697,
    "platforms": {
      "i": {
        "weekly": {"data": [312, 450, 389, ...], "keys": [48, 49, 50, ...]},
        "monthly": {"data": [8234, 9856, ...], "keys": [1, 2, 3, ...]},
        "total": 152345
      },
      "a": {
        "weekly": {"data": [211, 391, 223, ...], "keys": [48, 49, 50, ...]},
        "monthly": {"data": [7000, 8567, ...], "keys": [1, 2, 3, ...]},
        "total": 133352
      }
    }
  },
  "sent_automated": {
    "daily": {
      "data": [45, 67, 89, 56, 78, 92, 45, 67, 89, 76, 54, 89, 67, 45, 78, 90, 56, 78, 89, 67, 45, 89, 67, 56, 78, 89, 67, 89, 78, 90],
      "keys": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
    },
    "total": 2134,
    "platforms": {
      "i": {
        "daily": {"data": [25, 38, 45, ...], "keys": [0, 1, 2, ...]},
        "total": 1245
      },
      "a": {
        "daily": {"data": [20, 29, 44, ...], "keys": [0, 1, 2, ...]},
        "total": 889
      }
    }
  },
  "sent_tx": {
    "daily": {
      "data": [12, 23, 34, 21, 32, 45, 23, 34, 45, 32, 21, 34, 23, 21, 32, 43, 21, 32, 34, 23, 21, 34, 23, 21, 32, 34, 23, 34, 32, 43],
      "keys": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
    },
    "total": 867,
    "platforms": {
      "i": {
        "daily": {"data": [7, 13, 19, ...], "keys": [0, 1, 2, ...]},
        "total": 523
      },
      "a": {
        "daily": {"data": [5, 10, 15, ...], "keys": [0, 1, 2, ...]},
        "total": 344
      }
    }
  },
  "actions": {
    "weekly": {
      "data": [125, 203, 142, 287, 176, 234, 312, 256, 198, 345, 267, 298],
      "keys": [48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7]
    },
    "monthly": {
      "data": [3456, 4123, 5234, 4567, 5890, 6789, 6123, 6567, 7234, 7567, 7890, 8456],
      "keys": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    "total": 73896,
    "platforms": {
      "i": {
        "weekly": {"data": [78, 125, 95, ...], "keys": [48, 49, 50, ...]},
        "monthly": {"data": [2123, 2567, ...], "keys": [1, 2, 3, ...]},
        "total": 42345
      },
      "a": {
        "weekly": {"data": [47, 78, 47, ...], "keys": [48, 49, 50, ...]},
        "monthly": {"data": [1333, 1556, ...], "keys": [1, 2, 3, ...]},
        "total": 31551
      }
    }
  },
  "actions_automated": {
    "daily": {
      "data": [12, 18, 23, 15, 21, 28, 12, 18, 23, 19, 14, 23, 18, 12, 21, 27, 15, 21, 23, 18, 12, 23, 18, 15, 21, 23, 18, 23, 21, 27],
      "keys": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
    },
    "total": 567,
    "platforms": {
      "i": {
        "daily": {"data": [7, 10, 13, ...], "keys": [0, 1, 2, ...]},
        "total": 334
      },
      "a": {
        "daily": {"data": [5, 8, 10, ...], "keys": [0, 1, 2, ...]},
        "total": 233
      }
    }
  },
  "actions_tx": {
    "daily": {
      "data": [3, 6, 9, 5, 8, 12, 6, 9, 12, 8, 5, 9, 6, 5, 8, 11, 5, 8, 9, 6, 5, 9, 6, 5, 8, 9, 6, 9, 8, 11],
      "keys": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]
    },
    "total": 234,
    "platforms": {
      "i": {
        "daily": {"data": [2, 4, 5, ...], "keys": [0, 1, 2, ...]},
        "total": 145
      },
      "a": {
        "daily": {"data": [1, 2, 4, ...], "keys": [0, 1, 2, ...]},
        "total": 89
      }
    }
  },
  "enabled": {
    "total": 152341,
    "i": 85234,
    "a": 67107,
    "w": 0,
    "t": 0
  },
  "users": 152341,
  "platforms": {
    "i": "iOS",
    "a": "Android",
    "w": "Web",
    "h": "Huawei"
  },
  "tokens": {
    "tkip": "iOS Production",
    "tkid": "iOS Development",
    "tkap": "FCM",
    "tkad": "FCM Test Mode",
    "tkwp": "Web",
    "tkhp": "HMS",
    "tkhd": "HMS Test Mode"
  }
}
```

**Response Structure**:

- **`kafkaStatus`** (Object): Kafka availability status
  - `available` (Boolean): Whether Kafka is connected and ready
  - `error` (String|null): Error message if unavailable

- **`sent`** (Object): All sent notifications (one-time campaigns)
  - `weekly` (Object): Last 12 weeks data
    - `data` (Array[Number]): Counts for each week (12 elements)
    - `keys` (Array[Number]): ISO week numbers (48-53, 1-7 range)
  - `monthly` (Object): Last 12 months data
    - `data` (Array[Number]): Counts for each month (12 elements)
    - `keys` (Array[Number]): Month numbers (1-12)
  - `total` (Number): Total sent across all time
  - `platforms` (Object): Per-platform breakdown (i, a, w keys)
    - Same structure as parent (weekly, monthly, total)

- **`sent_automated`** (Object): Automated campaign sends (event/cohort/recurring)
  - `daily` (Object): Last 30 days data
    - `data` (Array[Number]): Counts for each day (30 elements)
    - `keys` (Array[Number]): Day indices (0-29, 0=today, 29=30 days ago)
  - `total` (Number): Total automated sends (last 30 days)
  - `platforms` (Object): Per-platform breakdown

- **`sent_tx`** (Object): Transactional sends (API-triggered)
  - Same structure as `sent_automated`

- **`actions`** (Object): Actions on all notifications (taps)
  - Same structure as `sent`

- **`actions_automated`** (Object): Actions on automated notifications
  - Same structure as `sent_automated`

- **`actions_tx`** (Object): Actions on transactional notifications
  - Same structure as `sent_automated`

- **`enabled`** (Object): Users with push tokens
  - `total` (Number): Total users with at least one token
  - `i` (Number): Users with iOS tokens
  - `a` (Number): Users with Android tokens
  - `w` (Number): Users with Web tokens
  - `t` (Number): Test tokens (not used in production)

- **`users`** (Number): Total app users (all users, not just push-enabled)

- **`platforms`** (Object): Platform display names
  - Keys: Platform codes (i, a, w, h)
  - Values: Display names ("iOS", "Android", "Web", "Huawei")

- **`tokens`** (Object): Token type display names
  - Keys: Token field names (tkip, tkid, tkap, tkad, tkwp, tkhp, tkhd)
  - Values: Display names ("iOS Production", "FCM", etc.)

#### Success Response - No Data
**Status Code**: `200 OK`

**Body**: Returns structure with zero values and empty arrays

```json
{
  "kafkaStatus": {"available": false, "error": "Kafka producer is not connected"},
  "sent": {
    "weekly": {"data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "keys": [48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7]},
    "monthly": {"data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "keys": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]},
    "total": 0,
    "platforms": {}
  },
  "sent_automated": {"daily": {"data": [0, 0, ...], "keys": [0, 1, ...]}, "total": 0, "platforms": {}},
  "sent_tx": {"daily": {"data": [0, 0, ...], "keys": [0, 1, ...]}, "total": 0, "platforms": {}},
  "actions": {"weekly": {"data": [0, 0, ...], "keys": [...]}, "monthly": {"data": [0, 0, ...], "keys": [...]}, "total": 0, "platforms": {}},
  "actions_automated": {"daily": {"data": [0, 0, ...], "keys": [0, 1, ...]}, "total": 0, "platforms": {}},
  "actions_tx": {"daily": {"data": [0, 0, ...], "keys": [0, 1, ...]}, "total": 0, "platforms": {}},
  "enabled": {"total": 0, "i": 0, "a": 0, "w": 0, "t": 0},
  "users": 0,
  "platforms": {"i": "iOS", "a": "Android", "w": "Web", "h": "Huawei"},
  "tokens": {"tkip": "iOS Production", "tkid": "iOS Development", "tkap": "FCM", "tkad": "FCM Test Mode", "tkwp": "Web", "tkhp": "HMS", "tkhd": "HMS Test Mode"}
}
```

#### Error Response - Validation Error
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "errors": ["app_id is required"]
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
   - Validates required parameter: `app_id`
   - Returns 400 if validation fails

2. **App Lookup**
   - Queries `apps` collection for app details
   - Extracts timezone for date calculations
   - Returns error if app not found

3. **Date Range Calculation**
   - **Current date**: Now in app timezone
   - **Weekly**: Last 12 complete ISO weeks + current week
   - **Monthly**: Last 12 complete months + current month
   - **Daily**: Last 30 days (0=today, 29=30 days ago)

4. **Event Data Query**
   - Queries `events_data` collection for:
     - `[CLY]_push_sent` events (sent notifications)
     - `[CLY]_push_action` events (notification taps)
   - Segments queried:
     - `no-segment`: Total counts (all campaigns)
     - `a`: Automated flag (true/false)
     - `t`: Transactional flag (true/false)
     - `p`: Platform (i, a, w, h)
     - `ap`: Automated + Platform
     - `tp`: Transactional + Platform

5. **User Count Queries**
   - Queries `app_users{app_id}` collection
   - Counts users with push tokens by platform:
     - iOS: `tkip` or `tkid` field exists
     - Android: `tkap` or `tkad` field exists
     - Web: `tkwp` field exists
   - Total user count: All users in collection

6. **Data Aggregation**
   - For each event document:
     - Extracts year, month, day from document ID
     - Maps to weekly/monthly/daily buckets
     - Accumulates counts by segment
   - **One-time campaigns**: Weekly/monthly aggregation
   - **Automated**: Subtract from one-time, add to daily automated
   - **Transactional**: Subtract from one-time, add to daily tx
   - **Per-platform**: Separate tracking for i, a, w

7. **Kafka Status Check**
   - Calls `verifyKafka()` to check connection
   - Checks `isProducerInitialized()` status
   - Returns availability and error message

8. **Response Assembly**
   - Constructs nested response structure
   - Fills in missing periods with 0 counts
   - Returns comprehensive metrics object

### Event Data Structure

Countly stores push events in `events_data` collection:

**Document Structure**:
```javascript
{
  _id: "2024:12:[CLY]_push_sent_507f1f77bcf86cd799439012_no-segment",
  s: "no-segment",  // Segment key
  d: {
    "1": {c: 523},     // Day 1 count
    "2": {c: 841},
    "15": {c: 1023}
  }
}
```

**Document ID Format**: `{year}:{month}:{event_key}_{app_id}_{segment}`

**Segment Types**:
- **`no-segment`**: Total counts (all campaigns)
- **`a`**: Automated flag segment (key: `true` or `false`)
- **`t`**: Transactional flag segment (key: `true` or `false`)
- **`p`**: Platform segment (key: `i`, `a`, `w`, `h`)
- **`ap`**: Automated+Platform (key: `truei`, `truea`, etc.)
- **`tp`**: Transactional+Platform (key: `truei`, `truea`, etc.)

### Date Calculations

**ISO Weeks** (for weekly data):
- Week starts Monday, ends Sunday
- Numbered 1-53 per ISO 8601
- Current week is last element in array
- Keys array: `[48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7]` (example crossing year boundary)

**Months** (for monthly data):
- 1-indexed (1=January, 12=December)
- Current month is last element
- Keys array: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]` (most recent 12 months)

**Days** (for daily data):
- 0-indexed with 0=today, 29=30 days ago
- Keys array: `[0, 1, 2, ..., 29]`
- Data array index matches key index

### Campaign Type Segmentation

**One-Time Campaigns** (sent, actions):
- Trigger types: `plain` (scheduled one-time sends)
- Weekly/monthly aggregation
- **Calculation**: Total sent - Automated - Transactional

**Automated Campaigns** (sent_automated, actions_automated):
- Trigger types: `event`, `cohort`, `recurring`, `multi`
- Daily aggregation (last 30 days)
- **Identification**: Event data with `s="a"` segment, key `"true"`

**Transactional Campaigns** (sent_tx, actions_tx):
- Trigger type: `api`
- Daily aggregation (last 30 days)
- **Identification**: Event data with `s="t"` segment, key `"true"`

### Platform Aggregation

**Platform Codes**:
- **`i`**: iOS (includes both production and development tokens)
- **`a`**: Android (FCM)
- **`w`**: Web Push
- **`h`**: Huawei (HMS) - **Note**: Merged with Android in data

**Huawei Merging**:
- Huawei counts added to Android (`a`) platform
- Separate `h` key removed from response
- Test platform (`t`) removed from response

### Token Types

| Token Field | Platform | Environment | Display Name |
|-------------|----------|-------------|--------------|
| `tkip` | iOS | Production | "iOS Production" |
| `tkid` | iOS | Development | "iOS Development" |
| `tkap` | Android | Production | "FCM" |
| `tkad` | Android | Test | "FCM Test Mode" |
| `tkwp` | Web | Production | "Web" |
| `tkhp` | Huawei | Production | "HMS" |
| `tkhd` | Huawei | Test | "HMS Test Mode" |

### Kafka Status

**Purpose**: Indicates whether transactional push (API-triggered) is operational

**Checks**:
1. `verifyKafka()`: Checks Kafka connection configuration
2. `isProducerInitialized()`: Checks Kafka producer connection status

**Status Values**:
- **`available: true`**: Kafka connected, API push operational
- **`available: false`**: Kafka disconnected, API push may fail
- **`error`**: Descriptive error message if unavailable

---

## Examples

### Example 1: Get dashboard metrics

**Description**: Retrieve all push notification metrics for dashboard

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/dashboard" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012"
```

**Response** (200): See full response structure above

### Example 2: Dashboard with no push activity

**Description**: New app with no push notifications sent yet

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/dashboard" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439099"
```

**Response** (200):
```json
{
  "kafkaStatus": {"available": true, "error": null},
  "sent": {
    "weekly": {"data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "keys": [48, 49, 50, 51, 52, 1, 2, 3, 4, 5, 6, 7]},
    "monthly": {"data": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], "keys": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]},
    "total": 0,
    "platforms": {}
  },
  "sent_automated": {"daily": {"data": [0, 0, 0, ...], "keys": [0, 1, 2, ...]}, "total": 0, "platforms": {}},
  "sent_tx": {"daily": {"data": [0, 0, 0, ...], "keys": [0, 1, 2, ...]}, "total": 0, "platforms": {}},
  "actions": {"weekly": {"data": [0, 0, ...], "keys": [...]}, "monthly": {"data": [0, 0, ...], "keys": [...]}, "total": 0, "platforms": {}},
  "actions_automated": {"daily": {"data": [0, 0, ...], "keys": [0, 1, ...]}, "total": 0, "platforms": {}},
  "actions_tx": {"daily": {"data": [0, 0, ...], "keys": [0, 1, ...]}, "total": 0, "platforms": {}},
  "enabled": {"total": 1523, "i": 843, "a": 680, "w": 0, "t": 0},
  "users": 1523,
  "platforms": {"i": "iOS", "a": "Android", "w": "Web", "h": "Huawei"},
  "tokens": {"tkip": "iOS Production", "tkid": "iOS Development", "tkap": "FCM", "tkad": "FCM Test Mode", "tkwp": "Web", "tkhp": "HMS", "tkhd": "HMS Test Mode"}
}
```

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `apps` | Application metadata/config | Stores app-level settings and metadata read/updated by this endpoint. |
| `events_data` | Aggregated events data | Stores aggregated event metric documents touched by this endpoint. |
| `app_users{app_id}` | Per-app user profiles | Stores user-level profile fields read or modified by this endpoint. |
| `Week calculation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Timezone` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Date range` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Historical data` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Fixed periods` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No filtering` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Aggregation only` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Platform merge` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Query time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Event data` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `User counts` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Total response time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Kafka status` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message Stats](./message-stats.md) - Time-series statistics for individual campaigns
- [Message List](./message-all.md) - List all campaigns with filtering
- [Message Get](./message-get.md) - Single campaign details with result statistics

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - metrics retrieved | Full dashboard metrics object |
| `400` | Missing app_id parameter | `{"errors": ["app_id is required"]}` |
| `400` | Invalid app_id format | `{"errors": ["Invalid or missing parameters"]}` |
| `400` | App not found | `{"errors": ["App not found"]}` |
| `500` | Database error | `{"kind": "ServerError", "errors": ["Server error"]}` |

---

## Implementation Notes

1. **Event segmentation**: Uses 6 segment types (no-segment, a, t, p, ap, tp)
2. **Date calculations**: Timezone-aware using app's configured timezone
3. **ISO weeks**: Follows ISO 8601 standard (Monday start, weeks 1-53)
4. **Platform merging**: Huawei (`h`) merged into Android (`a`), test (`t`) removed
5. **Automated subtraction**: Automated counts subtracted from one-time (weekly/monthly)
6. **Transactional subtraction**: Transactional counts subtracted from one-time
7. **Daily vs weekly/monthly**: Automated/tx use daily (30 days), one-time use weekly/monthly
8. **Zero filling**: Returns 0 for periods with no data (not omitted)
9. **Token counts**: Aggregated across production and test environments
10. **Kafka check**: Real-time check on each request (not cached)
11. **Total users**: All users in app_users collection, not just push-enabled
12. **Platform names**: Hardcoded display names returned for UI

## Last Updated

February 2026
