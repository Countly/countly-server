---
sidebar_label: "Message Estimate"
---

# /o/push/message/estimate

## Overview

Estimate the audience size and locale distribution for a push notification campaign before creating it. Performs aggregation query on the user database with specified filters and platform requirements, returning total user count and breakdown by language. Useful for planning campaigns and understanding potential reach.

**Related Endpoints**:
- [Message Create](./message-create.md) - Create campaign after estimating
- [Message Test](./message-test.md) - Test notification content
- [Message List](./message-all.md) - View existing campaigns

---

## Endpoint


```plaintext
/o/push/message/estimate
```

## Authentication

- **Required Permission**: Read access to `push` feature (`read-permission validation`)
- **HTTP Methods**: GET recommended (POST also supported)
- **Content-Type**: application/x-www-form-urlencoded or JSON

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API authentication key |
| `app_id` | String | Yes | Application ID (alias for `app`) |
| `app` | ObjectID | Yes | Application ID (MongoDB ObjectID) |
| `platforms` | String[] | Yes | Platforms to estimate for: `["i", "a", "w", "h"]` (iOS, Android, Web, Huawei) |
| `filter` | Object | No | Audience targeting filter (empty = all users with tokens) |
| `filter.user` | JSON String | No | MongoDB query for `app_users{APP_ID}` collection |
| `filter.drill` | JSON String | No | Drill plugin filter (requires Drill plugin) |
| `filter.geos` | ObjectID[] | No | Array of geo location IDs |
| `filter.cohorts` | String[] | No | Array of cohort IDs |

### Platform Codes

| Code | Platform | Token Fields Checked |
|------|----------|---------------------|
| `i` | iOS | `tkip` (production), `tkid` (development) |
| `a` | Android | `tkap` (production), `tkad` (development) |
| `w` | Web | `tkwp` |
| `h` | Huawei | `tkhp` |

## Response

#### Success Response - Estimate Calculated
**Status Code**: `200 OK`

**Body**: Total count and locale breakdown

### Success Response

```json
{
  "count": 15420,
  "locales": {
    "en": 8500,
    "tr": 3200,
    "de": 2100,
    "fr": 1320,
    "default": 300
  }
}
```

**Response Fields**:
- **`count`** (Number): Total number of users who will receive the notification
- **`locales`** (Object): Breakdown by language code
  - Keys: 2-letter ISO language codes (`en`, `tr`, etc.) + `default` for users without language
  - Values: User count for each locale

#### Error Response - Validation Error
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "errors": [
    "platforms is required"
  ]
}
```

#### Error Response - No App
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "errors": [
    "No such app"
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
| `count` | Number | Estimated number of users matching app/platform/filter conditions. |
| `locales` | Object | Locale distribution map where key is locale and value is recipient count. |


### Error Responses

```json
{
  "result": "Error"
}
```

## Permissions

- Required Permission: Read access to push feature (read-permission validation)

## Behavior/Processing

### Operation Flow

1. **Validation**
   - Validates `app`, `platforms`, `filter` parameters
   - Checks platforms are valid: `i`, `a`, `w`, `h`
   - Initializes empty filter if not provided

2. **App & Credentials Verification**
   - Queries `apps` collection for app document
   - For each platform: Checks `apps.features.push.{platform}._id` exists
   - Rejects if credentials missing or set to 'demo'

3. **Filter Processing**
   - Converts user filter (JSON string) to MongoDB query
   - Converts drill filter (JSON string) to Drill query (if Drill feature enabled)
   - Looks up geo location documents if geo IDs provided
   - Looks up cohort documents if cohort IDs provided

4. **Aggregation Pipeline Building**
   - Calls `buildUserAggregationPipeline()` to construct MongoDB aggregation
   - Pipeline stages:
     - **Platform filter**: Users with tokens for requested platforms
     - **User filter**: Custom MongoDB query from `filter.user`
     - **Drill filter**: Drill-based filtering (if enabled)
     - **Geo filter**: Users in specified geo locations
     - **Cohort filter**: Users in specified cohorts

5. **Total Count Query**
   - Runs aggregation pipeline with `$count` stage
   - Returns total number of matching users
   - Example: `db.app_users507f.aggregate([...pipeline, {$count: 'count'}])`

6. **Locale Breakdown Query**
   - Runs aggregation pipeline with locale grouping:
     - `$project`: Extract `la` (language) field
     - `$group`: Group by language, count per language
   - Returns map of language codes to user counts
   - Example: `{en: 8500, tr: 3200, default: 300}`

7. **Response**
   - Combines total count and locale breakdown
   - Returns immediately (no database writes)

### User Aggregation Pipeline

The aggregation pipeline selects users matching all specified criteria:

```javascript
[
  // Stage 1: Platform token filter
  {
    $match: {
      $or: [
        { tkip: { $exists: true } },  // iOS production
        { tkid: { $exists: true } }   // iOS development
      ]
    }
  },
  // Stage 2: User filter (if provided)
  {
    $match: { country: "US" }
  },
  // Stage 3: Geo filter (if provided)
  {
    $match: {
      $or: [
        { geo: geo_id_1 },
        { geo: geo_id_2 }
      ]
    }
  },
  // Stage 4: Cohort filter (if provided)
  {
    $match: {
      chr: { $in: ['cohort1', 'cohort2'] }
    }
  }
]
```

### Filter Types

**User Filter** (`filter.user`):
- Direct MongoDB query on `app_users{APP_ID}` collection
- Example: `{"country": "US", "custom.premium": true}`
- Most flexible, allows any MongoDB query operators

**Drill Filter** (`filter.drill`):
- Drill feature filter format
- Requires Drill feature enabled
- Example: `{"sg.type":"paid","sg.paying":"true"}`
- Converted to MongoDB query internally

**Geo Filter** (`filter.geos`):
- Array of geo location ObjectIDs
- Queries `geos` collection to get location definitions
- Matches users with `geo` field in specified locations

**Cohort Filter** (`filter.cohorts`):
- Array of cohort IDs (string format)
- Matches users with cohort membership in `chr` array field
- Example: `["premium_users", "active_users"]`

**Filter Combination**:
All filters are AND-ed together. Users must match ALL specified filters to be counted.

### Platform Token Matching

The endpoint checks for push tokens specific to each platform:

**iOS** (`i`):
- Production: `tkip` field exists and not empty
- Development: `tkid` field exists and not empty
- User counted if either production OR development token exists

**Android** (`a`):
- Production: `tkap` field exists and not empty
- Development: `tkad` field exists and not empty  
- User counted if either production OR development token exists

**Web** (`w`):
- Production: `tkwp` field exists and not empty

**Huawei** (`h`):
- Production: `tkhp` field exists and not empty

**Multiple Platforms**:
If multiple platforms specified (e.g., `["i", "a"]`), user is counted if they have a token for ANY of the requested platforms.

### Locale Detection

The endpoint groups users by the `la` field (2-letter language code):
- **`la` field present**: Grouped by language code (e.g., `en`, `tr`, `de`)
- **`la` field missing**: Counted in `default` locale
- **Locale breakdown**: Useful for planning multi-language campaigns

Example locale distribution:
```json
{
  "en": 8500,   // 8500 English-speaking users
  "tr": 3200,   // 3200 Turkish-speaking users
  "de": 2100,   // 2100 German-speaking users
  "default": 300 // 300 users without language preference
}
```

---

## Examples

### Example 1: Estimate all users on iOS

**Description**: Count all iOS users with push tokens

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/estimate" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "platforms=[\"i\"]"
```

**Response** (200):
```json
{
  "count": 12500,
  "locales": {
    "en": 7500,
    "tr": 3000,
    "de": 1500,
    "default": 500
  }
}
```

### Example 2: Estimate multi-platform campaign

**Description**: Count users on iOS, Android, and Web

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/estimate" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "platforms=[\"i\",\"a\",\"w\"]"
```

**Response** (200):
```json
{
  "count": 45300,
  "locales": {
    "en": 28000,
    "tr": 8500,
    "de": 5200,
    "fr": 2100,
    "es": 1200,
    "default": 300
  }
}
```

### Example 3: Estimate with user filter

**Description**: Count US users on Android

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/estimate" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "platforms=[\"a\"]" \
  -d "filter={\"user\":\"{\\\"country\\\":\\\"US\\\"}\"}"
```

**Response** (200):
```json
{
  "count": 8200,
  "locales": {
    "en": 7800,
    "es": 350,
    "default": 50
  }
}
```

### Example 4: Estimate with cohort filter

**Description**: Count premium users on all platforms

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/estimate" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "platforms=[\"i\",\"a\"]" \
  -d "filter={\"cohorts\":[\"premium_users\"]}"
```

**Response** (200):
```json
{
  "count": 1250,
  "locales": {
    "en": 800,
    "de": 250,
    "fr": 150,
    "default": 50
  }
}
```

### Example 5: Estimate with geo filter

**Description**: Count users in specific geographic locations

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/estimate" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "platforms=[\"i\",\"a\"]" \
  -d "filter={\"geos\":[\"507f1f77bcf86cd799439011\",\"507f1f77bcf86cd799439013\"]}"
```

**Response** (200):
```json
{
  "count": 3400,
  "locales": {
    "en": 2100,
    "tr": 900,
    "ar": 350,
    "default": 50
  }
}
```

### Example 6: Estimate with complex filter

**Description**: Count premium US users who made a purchase

**Request** (POST):
```bash
curl -X POST "https://your-server.com/o/push/message/estimate" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "YOUR_API_KEY",
    "app": "507f1f77bcf86cd799439012",
    "platforms": ["i", "a"],
    "filter": {
      "user": "{\"country\":\"US\",\"custom.premium\":true,\"events.purchase\":{\"$exists\":true}}",
      "cohorts": ["active_users"]
    }
  }'
```

**Response** (200):
```json
{
  "count": 420,
  "locales": {
    "en": 390,
    "es": 25,
    "default": 5
  }
}
```

### Example 7: Estimate with drill filter

**Description**: Count paying users using Drill filter (requires Drill feature)

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/estimate" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "platforms=[\"i\",\"a\"]" \
  -d "filter={\"drill\":\"{\\\"sg.type\\\":\\\"paid\\\",\\\"sg.paying\\\":\\\"true\\\"}\"}"
```

**Response** (200):
```json
{
  "count": 5600,
  "locales": {
    "en": 3500,
    "tr": 1200,
    "de": 700,
    "default": 200
  }
}
```

---

## Technical Notes

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `apps` | Application metadata/config | Stores app-level settings and metadata read/updated by this endpoint. |
| `app_users{APP_ID}` | Per-app user profiles | Stores user-level profile fields read or modified by this endpoint. |
| `geos` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `cohorts` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Credentials location` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Credential documents` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Demo credentials` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No scheduling` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No timezone` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No delay` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Snapshot estimate` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Token validity` | Token records | Stores API/auth token records managed by this endpoint. |
| `Platform availability` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `User engagement` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message Create](./message-create.md) - Create campaign after estimating audience
- [Message Test](./message-test.md) - Test notification before creating campaign
- [Message List](./message-all.md) - View existing campaigns and their stats
- [Message Get](./message-get.md) - Get detailed campaign information
- [Dashboard](./dashboard.md) - View overall push statistics

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - estimate calculated | Count and locale breakdown |
| `400` | Missing required parameters | `{"errors": ["platforms is required"]}` |
| `400` | Invalid platform code | `{"errors": ["Invalid platform: x"]}` |
| `400` | App not found | `{"errors": ["No such app"]}` |
| `400` | No push credentials | `{"kind": "ValidationError", "errors": ["No push credentials for iOS platform"]}` |
| `400` | Invalid filter format | `{"errors": ["Invalid user filter JSON"]}` |
| `400` | Nonexistent geo | `{"errors": ["No such geo: 507f..."]}` |
| `400` | Nonexistent cohort | `{"errors": ["No such cohort: premium_users"]}` |
| `500` | Aggregation error | `{"errors": ["Error estimating audience: ..."]}` |
| `500` | Database error | `{"kind": "ServerError", "errors": ["Server error"]}` |

---

## Implementation Notes

1. **Read-only operation**: No database writes, safe to call repeatedly
2. **Aggregation-based**: Uses MongoDB aggregation pipeline for efficient counting
3. **Platform OR logic**: Users with tokens for ANY requested platform counted
4. **Filter AND logic**: Users must match ALL specified filters
5. **Locale grouping**: Always returns locale breakdown, useful for planning
6. **Credentials check**: Requires valid push credentials even for estimation
7. **No test mode**: Returns actual user counts, not test users
8. **Snapshot accuracy**: Counts current users, may differ from actual send
9. **Performance consideration**: Large apps may take several seconds to estimate
10. **Index dependency**: Query performance depends on proper database indexes
11. **Planning workflow**: Estimate → Test → Create campaign
12. **Filter validation**: Validates geo/cohort IDs exist before running aggregation

## Last Updated

February 2026
