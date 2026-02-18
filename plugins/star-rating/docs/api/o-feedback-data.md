---
sidebar_label: "Get Feedback Data"
---

# /o/feedback/data

## Overview

Retrieve collected feedback submissions and aggregated metrics. Returns feedback comments, ratings, and analytics. Supports filtering by widget, rating, date range, and more

---

## Endpoint


```plaintext
/o/feedback/data
```

## Authentication

- **Required**: API key with read permission
- **HTTP Method**: GET or POST
- **Permission**: Read access to feedback feature

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API key with read permission |
| `app_id` | String | Yes | Application ID |
| `widget_id` | String | No | Filter by specific widget |
| `rating` | Number | No | Filter by rating (1-5) |
| `start_date` | String | No | Start date (YYYY-MM-DD) |
| `end_date` | String | No | End date (YYYY-MM-DD) |
| `limit` | Number | No | Maximum results (default: 100) |
| `skip` | Number | No | Results to skip for pagination |
| `sort` | String | No | Sort field (timestamp, rating) |

## Response

#### Success Response
**Status Code**: `200 OK`

**Body**:
### Success Response

```json
{
  "result": {
    "data": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "widget_id": "507f1f77bcf86cd799439012",
        "app_id": "507f1f77bcf86cd799439010",
        "rating": 5,
        "comment": "Great app!",
        "email": "user@example.com",
        "device_id": "device_456",
        "timestamp": "2024-02-13T10:30:00Z"
      }
    ],
    "total": 150
  }
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

- Required: API key with read permission


## Database Collections

This endpoint does not read or write database collections.
## Examples

### Example 1: Get all feedback

**Description**: Retrieve all feedback for application

**Request** (GET):
```bash
curl "https://your-server.com/o/feedback/data?api_key=YOUR_API_KEY&app_id=YOUR_APP_ID&limit=50"
```

**Response** (200):
```json
{
  "result": {
    "data": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "widget_id": "507f1f77bcf86cd799439012",
        "rating": 5,
        "comment": "Excellent experience",
        "timestamp": "2024-02-13T10:30:00Z"
      }
    ],
    "total": 247
  }
}
```

### Example 2: Filter by rating and date

**Description**: Get only 4-5 star ratings for last week

**Request** (GET):
```bash
curl "https://your-server.com/o/feedback/data?api_key=YOUR_API_KEY&app_id=YOUR_APP_ID&rating=5&start_date=2024-02-06&end_date=2024-02-13"
```

**Response** (200):
```json
{
  "result": {
    "data": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "widget_id": "507f1f77bcf86cd799439012",
        "rating": 5,
        "comment": "Amazing!",
        "email": "happy@example.com",
        "timestamp": "2024-02-13T09:15:00Z"
      },
      {
        "_id": "507f1f77bcf86cd799439013",
        "widget_id": "507f1f77bcf86cd799439012",
        "rating": 5,
        "comment": "Love it",
        "timestamp": "2024-02-12T14:22:00Z"
      }
    ],
    "total": 45
  }
}
```

### Example 3: Get feedback for specific widget

**Description**: Retrieve feedback for single widget

**Request** (GET):
```bash
curl "https://your-server.com/o/feedback/data?api_key=YOUR_API_KEY&app_id=YOUR_APP_ID&widget_id=507f1f77bcf86cd799439012&limit=100"
```

**Response** (200):
```json
{
  "result": {
    "data": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "widget_id": "507f1f77bcf86cd799439012",
        "rating": 4,
        "comment": "Very good",
        "email": "user123@example.com",
        "timestamp": "2024-02-13T08:45:00Z"
      },
      {
        "_id": "507f1f77bcf86cd799439014",
        "widget_id": "507f1f77bcf86cd799439012",
        "rating": 5,
        "comment": "Perfect!",
        "timestamp": "2024-02-13T07:20:00Z"
      }
    ],
    "total": 89
  }
}
```

---

## Behavior/Processing

### Data Retrieval Flow

1. **Validate** API key and permissions
2. **Parse** filter parameters
3. **Query** feedback collection
4. **Apply** filters (widget, rating, date range)
5. **Sort** results
6. **Paginate** with limit/skip
7. **Return** feedback array and total count

### Filter Application

**Filtering logic**:
- Widget: Exact match on widget_id
- Rating: Numeric match (1-5)
- Date range: Inclusive between timestamps
- Combination: AND logic (all filters must match)

### Aggregation

**Summary metrics** (if requested):
- Average rating
- Rating distribution (1-5 counts)
- Total comments
- Comments with emails

---

## Technical Notes

### Database Operations

**Collection**: `feedback`

**Query example**:
```javascript
db.feedback.find({
  app_id: app_id,
  widget_id: widget_id,
  rating: { $gte: rating },
  timestamp: { $gte: start_date, $lte: end_date }
})
.sort({ timestamp: -1 })
.limit(100)
.skip(0)
```

**Returned fields**:
- `_id` - Document ID
- `app_id` - Application ID
- `widget_id` - Widget identifier
- `rating` - Rating value (1-5)
- `comment` - User comment text
- `email` - Contact email if provided
- `device_id` - Device identifier
- `timestamp` - Submission time

### Pagination

**For large result sets**:
```javascript
// Request page 2 (50 per page)
limit: 50,
skip: 50  // First page is 0-49, second page is 50-99
```

### Date Format

**Supported formats**:
- ISO8601: `2024-02-13T10:30:00Z`
- Date only: `2024-02-13`
- Unix timestamp: `1707817800`

---

## Related Endpoints

- [List Widgets](./o-feedback-widgets.md) - Get available widgets
- [Widget Details](./o-feedback-widget.md) - Specific widget config
- [Record Feedback](./i-feedback-input.md) - Submit feedback

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success | Feedback array with total count |
| `200` | No results found | Empty data array |
| `200` | Invalid date format | Error message |
| `200` | Insufficient permission | Error message |
| `401` | Invalid API key | Authentication error |
| `500` | Database error | Error message |

---

## Implementation Notes

1. **Read-only operation**: Does not modify data
2. **Pagination support**: limit and skip parameters
3. **Multi-filter**: Combine filters for detailed queries
4. **Chronological order**: Sorted by timestamp descending
5. **Total count**: Always includes total matching count
6. **Comment storage**: Full text preserved
7. **Email optional**: Stored if user provided
8. **Device tracking**: Identifies device that submitted
9. **Widget attribution**: Links to specific widget
10. **Historical data**: Retains all submissions
11. **Export ready**: Data structure suitable for export
12. **Performance indexed**: Indexed on app_id and timestamp  
Endpoint: /o/feedback/data
## Last Updated

February 2026
