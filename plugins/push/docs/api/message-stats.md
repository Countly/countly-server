---
sidebar_label: "Message Stats (Periodic)"
---

# /o/push/message/stats

## Overview

Get time-series statistics for a specific push notification campaign. Returns sent and actioned event counts grouped by time period (daily, weekly, or monthly). Useful for visualizing campaign performance over time, tracking engagement trends, and analyzing campaign effectiveness.

**Related Endpoints**:
- [Message Get](./message-get.md) - Retrieve campaign details
- [Message List](./message-all.md) - List all campaigns
- [Dashboard](./dashboard.md) - Overall push statistics

---

## Endpoint


```plaintext
/o/push/message/stats
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
| `_id` | ObjectID | Yes | Message ID to get stats for |
| `period` | String | No | Time period: `30days`, `24weeks`, `12months` (default: `30days`) |

### Period Options

| Period Value | Time Range | Data Points | Granularity |
|--------------|------------|-------------|-------------|
| `30days` | Last 30 days | 30 | Daily |
| `24weeks` | Last 24 weeks | 24 | Weekly |
| `12months` | Last 12 months | 12 | Monthly |

## Response

#### Success Response - Statistics Retrieved
**Status Code**: `200 OK`

**Body**: Time-series data for sent and actioned events

### Success Response

```json
{
  "sent": [
    ["2024-12-01T00:00:00.000Z", 523],
    ["2024-12-02T00:00:00.000Z", 841],
    ["2024-12-03T00:00:00.000Z", 612],
    ["2024-12-04T00:00:00.000Z", 1023],
    ["2024-12-05T00:00:00.000Z", 745]
  ],
  "action": [
    ["2024-12-01T00:00:00.000Z", 125],
    ["2024-12-02T00:00:00.000Z", 203],
    ["2024-12-03T00:00:00.000Z", 142],
    ["2024-12-04T00:00:00.000Z", 287],
    ["2024-12-05T00:00:00.000Z", 176]
  ]
}
```

**Response Format**:
- **`sent`** (Array[]): Array of `[timestamp, count]` pairs for sent notifications
- **`action`** (Array[]): Array of `[timestamp, count]` pairs for actioned (tapped) notifications
- **Timestamps**: ISO 8601 date strings marking period start
- **Counts**: Integer counts for that period

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

#### Error Response - Invalid Parameters
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "errors": [
    "Invalid or missing parameters"
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
   - Validates `_id` (message ID, ObjectID format)
   - Validates `period` (must be `30days`, `24weeks`, or `12months`)
   - Returns 400 if validation fails

2. **Message & App Retrieval**
   - Queries `messages` collection for message with `_id`
   - Queries `apps` collection for app details (timezone)
   - Returns 400 if message or app not found

3. **Event Collection Identification**
   - Calculates event collection names for sent and actioned events
   - Uses SHA-1 hash of event key + app_id
   - **Sent collection**: `events{SHA1('[CLY]_push_sent' + app_id)}`
   - **Actioned collection**: `events{SHA1('[CLY]_push_action' + app_id)}`

4. **Date Range Calculation**
   - **End date**: Current date/time in app timezone
   - **Start date**: End date minus period duration
   - **Date array**: Generates array of period start dates
     - Daily: Array of 30 dates
     - Weekly: Array of 24 week start dates (ISO weeks)
     - Monthly: Array of 12 month start dates

5. **Data Retrieval**
   - For each event type (sent, action):
     - Calls `countlyFetch.getTimeObjForEvents()` to retrieve event data
     - Queries event collection with app_id, period, segmentation
     - Filters by message ID in event data

6. **Aggregation**
   - For each period in date range:
     - **Daily/Monthly**: Directly reads count from event data
     - **Weekly**: Sums daily counts for week (Mon-Sun)
   - Builds array of `[date, count]` pairs
   - Converts dates to ISO 8601 strings

7. **Response**
   - Returns object with `sent` and `action` arrays
   - Each array contains time-series data points

### Event Data Structure

Countly stores push events in specialized collections:

**Event Collections**:
- Collection name: `events{SHA1_HASH}`
- Hash based on: Event key (`[CLY]_push_sent` or `[CLY]_push_action`) + app ID

**Document Structure**:
```javascript
{
  _id: "events{hash}",
  // Year level
  "2024": {
    // Month level (1-indexed)
    "12": {
      // Day level
      "15": {
        // Message ID level
        "507f1f77bcf86cd799439011": {
          c: 523  // Count
        }
      }
    }
  }
}
```

**Data Path**: `doc[year][month][day][messageId].c`

### Period Aggregation Logic

**Daily (30days)**:
- Reads count directly from event data path
- One data point per day
- Example path: `doc[2024][12][15][messageId].c`

**Weekly (24weeks)**:
- Sums counts for all days in ISO week (Monday-Sunday)
- Week boundaries determined by app timezone
- Example: Week starting 2024-12-09 = sum of Dec 9-15

**Monthly (12months)**:
- Reads aggregated monthly count
- One data point per month
- Example path: `doc[2024][12][messageId].c` (all days)

### Timezone Handling

All date calculations respect the app's configured timezone:
- **App timezone**: Stored in `apps.timezone` field
- **Date boundaries**: Day/week/month boundaries calculated in app timezone
- **ISO week**: Starts Monday, ends Sunday (ISO 8601)
- **Month boundaries**: First day to last day of month

### Performance Optimization

**Event Collection Strategy**:
- Events pre-aggregated by Countly SDK
- No real-time aggregation required
- Fast lookups by year/month/day path

**Query Optimization**:
- Single collection query per event type
- Document path traversal (no full scan)
- Message ID filtering at document level

---

## Examples

### Example 1: Get daily stats (30 days)

**Description**: Retrieve last 30 days of sent/actioned stats

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/stats" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439011" \
  -d "period=30days"
```

**Response** (200):
```json
{
  "sent": [
    ["2024-11-16T00:00:00.000Z", 0],
    ["2024-11-17T00:00:00.000Z", 0],
    ["2024-11-18T00:00:00.000Z", 0],
    ["2024-12-14T00:00:00.000Z", 5234],
    ["2024-12-15T00:00:00.000Z", 1823]
  ],
  "action": [
    ["2024-11-16T00:00:00.000Z", 0],
    ["2024-12-14T00:00:00.000Z", 1245],
    ["2024-12-15T00:00:00.000Z", 432]
  ]
}
```

### Example 2: Get weekly stats (24 weeks)

**Description**: Retrieve last 24 weeks of campaign performance

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/stats" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439022" \
  -d "period=24weeks"
```

**Response** (200):
```json
{
  "sent": [
    ["2024-06-24T00:00:00.000Z", 1250],
    ["2024-07-01T00:00:00.000Z", 1420],
    ["2024-12-09T00:00:00.000Z", 3245]
  ],
  "action": [
    ["2024-06-24T00:00:00.000Z", 312],
    ["2024-07-01T00:00:00.000Z", 385],
    ["2024-12-09T00:00:00.000Z", 856]
  ]
}
```

### Example 3: Get monthly stats (12 months)

**Description**: Retrieve last 12 months of campaign stats

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/stats" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439033" \
  -d "period=12months"
```

**Response** (200):
```json
{
  "sent": [
    ["2024-01-01T00:00:00.000Z", 15234],
    ["2024-02-01T00:00:00.000Z", 18423],
    ["2024-03-01T00:00:00.000Z", 21567],
    ["2024-12-01T00:00:00.000Z", 25890]
  ],
  "action": [
    ["2024-01-01T00:00:00.000Z", 3456],
    ["2024-02-01T00:00:00.000Z", 4123],
    ["2024-03-01T00:00:00.000Z", 5234],
    ["2024-12-01T00:00:00.000Z", 6789]
  ]
}
```

### Example 4: Default period (30 days)

**Description**: Omit period parameter for default 30-day view

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/stats" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439011"
```

**Response** (200):
```json
{
  "sent": [
    ["2024-11-16T00:00:00.000Z", 523],
    ["2024-12-15T00:00:00.000Z", 841]
  ],
  "action": [
    ["2024-11-16T00:00:00.000Z", 125],
    ["2024-12-15T00:00:00.000Z", 203]
  ]
}
```

### Example 5: Campaign with zero actions

**Description**: Campaign that was sent but not interacted with

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/stats" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "_id=507f1f77bcf86cd799439044"
```

**Response** (200):
```json
{
  "sent": [
    ["2024-12-14T00:00:00.000Z", 1000]
  ],
  "action": [
    ["2024-12-14T00:00:00.000Z", 0]
  ]
}
```

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `messages` | Push/message records | Stores push message definitions, status, and delivery metadata. |
| `apps` | Application metadata/config | Stores app-level settings and metadata read/updated by this endpoint. |
| `events{SHA1_HASH}` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `App timezone` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Event segmentation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Historical data` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Period options` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Message ID required` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No filtering` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Zero values` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Query time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Event lookup` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Weekly aggregation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Total response time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Real-time` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Latency` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Aggregation` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message Get](./message-get.md) - Get campaign details with total counts
- [Message List](./message-all.md) - List campaigns with aggregate stats
- [Dashboard](./dashboard.md) - Overall push statistics across all campaigns
- [Message Create](./message-create.md) - Create new campaign

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - statistics retrieved | Time-series data for sent and action |
| `400` | Missing required parameters | `{"errors": ["_id is required"]}` |
| `400` | Invalid period value | `{"errors": ["period must be one of: 30days, 24weeks, 12months"]}` |
| `400` | Message or app not found | `{"errors": ["Invalid or missing parameters"]}` |
| `400` | Invalid ObjectID format | `{"errors": ["_id must be ObjectID"]}` |
| `500` | Database error | `{"kind": "ServerError", "errors": ["Server error"]}` |

---

## Implementation Notes

1. **Event collection hashing**: Uses SHA-1 of event key + app_id for collection name
2. **Timezone-aware**: All date calculations use app's configured timezone
3. **ISO weeks**: Weekly periods follow ISO 8601 (Monday start, Sunday end)
4. **Pre-aggregation**: Leverages Countly's pre-aggregated event data
5. **Zero filling**: Returns 0 for periods with no data (not omitted from array)
6. **Weekly summing**: Weekly stats sum 7 daily values (Mon-Sun)
7. **Document paths**: Efficient O(1) lookup via year/month/day path
8. **Message ID filter**: Filters event data to specific message ID
9. **Two event types**: Always returns both `sent` and `action` arrays
10. **Fixed periods**: Cannot customize date ranges (use provided periods only)
11. **Timestamp format**: Returns ISO 8601 strings for period start dates
12. **Action rate**: Calculate action rate as: `action[i][1] / sent[i][1]`

## Last Updated

February 2026
