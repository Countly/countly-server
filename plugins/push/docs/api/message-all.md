---
sidebar_label: "Message List"
---

# /o/push/message/all

## Overview

List all push notification campaigns for an application with filtering, pagination, sorting, and search capabilities. Supports filtering by trigger type (plain, event, cohort, API, recurring), platform, status, and search text. Returns messages with basic statistics and schedules. Implements DataTables server-side processing format.

**Related Endpoints**:
- [Message Get](./message-get.md) - Retrieve single campaign details
- [Message Create](./message-create.md) - Create new campaign
- [Message Stats](./message-stats.md) - Get time-series statistics

---

## Endpoint


```plaintext
/o/push/message/all
```

## Authentication

- **Required Permission**: Read access to `push` feature (`validateRead`)
- **HTTP Methods**: GET recommended (all methods supported  )
- **Content-Type**: application/x-www-form-urlencoded or JSON

**HTTP Method Flexibility:**  
All Countly endpoints accept any HTTP method (GET, POST, PUT, DELETE) interchangeably.

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes | API authentication key |
| `app_id` | ObjectID | Yes | Application ID |
| `platform` | String | No | Filter by platform: `i`, `a`, `w`, `h` |
| `kind` | String[] | No | Trigger types: `plain`, `event`, `cohort`, `api`, `multi`, `recurring` |
| `auto` | Boolean | No | **[Deprecated]** Filter for event/cohort triggers (use `kind` instead) |
| `api` | Boolean | No | **[Deprecated]** Filter for API triggers (use `kind` instead) |
| `multi` | Boolean | No | **[Deprecated]** Filter for multi triggers (use `kind` instead) |
| `rec` | Boolean | No | **[Deprecated]** Filter for recurring triggers (use `kind` instead) |
| `removed` | Boolean | No | Include deleted messages (default: false) |
| `status` | String | No | Filter by status: `draft`, `active`, `stopped`, `scheduled`, `sending`, `sent`, etc. |
| `sSearch` | String | No | Search in message text and title (case-insensitive regex) |
| `iDisplayStart` | Number | No | Pagination offset (default: 0) |
| `iDisplayLength` | Number | No | Page size (default: no limit, -1 = all) |
| `iSortCol_0` | Number | No | Sort column index: 0=title, 1=status, 2=sent, 3=actioned, 4=created, 5=start |
| `sSortDir_0` | String | No | Sort direction: `asc` or `desc` (default: desc for start date) |
| `sEcho` | String | No | DataTables echo parameter (for client sync) |

## Response

#### Success Response - Message List
**Status Code**: `200 OK`

**Body**: DataTables format with message array

### Success Response

```json
{
  "sEcho": "1",
  "iTotalRecords": 150,
  "iTotalDisplayRecords": 150,
  "aaData": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "app": "507f1f77bcf86cd799439012",
      "platforms": ["i", "a"],
      "status": "scheduled",
      "triggers": [{
        "kind": "plain",
        "start": "2024-12-31T18:00:00.000Z"
      }],
      "contents": [{
        "message": "Happy New Year!",
        "title": "Celebration"
      }],
      "result": {
        "total": 15420,
        "processed": 0,
        "sent": 0,
        "actioned": 0,
        "failed": 0
      },
      "info": {
        "title": "New Year Campaign",
        "created": "2024-12-15T10:30:00.000Z",
        "lastDate": "2024-12-31T18:00:00.000Z"
      },
      "triggerObject": {
        "kind": "plain",
        "start": "2024-12-31T18:00:00.000Z"
      },
      "schedules": [{
        "_id": "507f1f77bcf86cd799439099",
        "status": "scheduled",
        "scheduledTo": "2024-12-31T18:00:00.000Z"
      }]
    },
    {
      "_id": "507f1f77bcf86cd799439022",
      "status": "active",
      "platforms": ["i"],
      "triggers": [{
        "kind": "event",
        "events": ["purchase"],
        "start": "2024-01-01T00:00:00.000Z"
      }],
      "result": {
        "sent": 12300,
        "actioned": 3400
      },
      "info": {
        "title": "Purchase Thank You",
        "created": "2024-01-01T08:00:00.000Z"
      }
    }
  ]
}
```

#### Error Response - Validation Error
**Status Code**: `400 Bad Request`

**Body**:
```json
{
  "errors": [
    "app_id is required"
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
   - Validates required parameters (`app_id`)
   - Validates optional filters (platform, kind, status)
   - Returns 400 if validation fails

2. **Filter Building**
   - **Base query**: `{ app: app_id, status: { $ne: 'deleted' } }`
   - **Kind filter**: Adds `triggers.kind: { $in: [kinds] }`
   - **Platform filter**: Adds `platforms: platform`
   - **Status filter**: Handles both message status and schedule status
   - **Search filter**: Adds `$or: [{"contents.message": regex}, {"contents.title": regex}]`

3. **Backward Compatibility**
   - Converts legacy parameters (`auto`, `api`, `multi`, `rec`) to `kind` array
   - `auto=true` → `kind: ["event", "cohort"]`
   - `api=true` → `kind: ["api"]`
   - `multi=true` → `kind: ["multi"]`
   - `rec=true` → `kind: ["recurring"]`
   - No filter specified → `kind: [all trigger types]`

4. **Aggregation Pipeline Construction**
   - **Stage 1**: Match base query (app, status, triggers)
   - **Stage 2**: Lookup schedules (join with message_schedules, limit 1 latest)
   - **Stage 3**: Apply additional filters (search, platform, status)
   - **Stage 4**: Facet into total count and data pipelines

5. **Data Pipeline** (within facet):
   - **Title resolution**: Adds `info.title` from contents if not set
   - **Sorting**: Sorts by selected column and direction
     - Special handling for drafts (always sorted first)
     - Date sorting uses `info.lastDate` (finished or start date)
   - **Pagination**: Skip + Limit
   - **Trigger object extraction**: Adds `triggerObject` field for UI display

6. **Status Recalculation**
   - For each message in results, calls `getMessageStatus(message, lastSchedule)`
   - Updates `status` field to reflect runtime state

7. **Response**
   - Returns DataTables-compatible format
   - **`sEcho`**: Request echo parameter (for client sync)
   - **`iTotalRecords`**: Total matching records
   - **`iTotalDisplayRecords`**: Same as iTotalRecords (no separate search count)
   - **`aaData`**: Array of message objects with computed fields

### Filter Behavior

**Trigger Type Filter** (`kind`):
- Empty or omitted: Returns all trigger types
- `["plain"]`: Only one-time scheduled campaigns
- `["event", "cohort"]`: Automated campaigns (event or cohort triggers)
- `["api"]`: API-triggered campaigns
- `["recurring"]`: Recurring scheduled campaigns
- **Backward compatibility**: `auto`, `api`, `multi`, `rec` parameters converted to `kind`

**Platform Filter** (`platform`):
- Omitted: Returns campaigns for all platforms
- `i`: Only iOS campaigns
- `a`: Only Android campaigns
- `w`: Only Web campaigns
- `h`: Only Huawei campaigns
- **Note**: Campaigns with multiple platforms (e.g., `["i", "a"]`) will match if any platform matches

**Status Filter** (`status`):
- Omitted: Returns all statuses except deleted
- `draft`: Draft campaigns
- `active`: Active automated campaigns
- `stopped`: Stopped automated campaigns
- `scheduled`, `sending`, `sent`, `canceled`, `failed`: Checks schedule status (not message status)
- **Special handling**: Schedule statuses query the `schedules` array

**Search Filter** (`sSearch`):
- Case-insensitive regex search
- Searches in `contents[].message` and `contents[].title`
- Applied across all content variants (platform/language overrides)

**Deleted Messages** (`removed`):
- Default: Excludes deleted messages (`status: { $ne: 'deleted' }`)
- `removed=true`: Includes deleted messages (admin feature)

### Sorting Behavior

**Sort Columns** (iSortCol_0):
- **0**: `info.title` - Campaign title (resolved from contents if not set)
- **1**: `status` - Campaign status
- **2**: `result.sent` - Sent count
- **3**: `result.actioned` - Actioned count
- **4**: `info.created` - Creation date
- **5**: `triggers.start` - Start date (default sort)

**Sort Direction** (sSortDir_0):
- **`asc`**: Ascending
- **`desc`**: Descending (default for most columns)

**Special Sorting**:
- **Title sort**: Resolves title from `info.title` or first content's message
- **Start date sort**: Uses `info.lastDate` (finished date if available, otherwise trigger start)
  - **Draft priority**: Drafts always sorted first (regardless of direction)
  - **Secondary sort**: By last date within draft/non-draft groups

### Pagination

**Parameters**:
- **`iDisplayStart`**: Offset (skip this many records)
- **`iDisplayLength`**: Page size (limit to this many records)
  - `-1`: No limit (all records)
  - Omitted: No limit (all records)

**Example**:
- Page 1 (0-49): `iDisplayStart=0&iDisplayLength=50`
- Page 2 (50-99): `iDisplayStart=50&iDisplayLength=50`
- Page 3 (100-149): `iDisplayStart=100&iDisplayLength=50`

### Computed Fields

**`info.title`**:
- Resolved from `info.title` if set
- Otherwise, takes `contents[0].message` (first content's message)
- Used for display and sorting

**`info.lastDate`**:
- `info.finished` if message completed
- Otherwise, `triggerObject.start` (trigger start date)
- Used for sorting

**`info.isDraft`**:
- `1` if status is "draft"
- `0` otherwise
- Used for draft-first sorting

**`triggerObject`**:
- Extracted trigger object matching the filter
- For `kind=["event", "cohort"]`: First event or cohort trigger
- For `kind=["api"]`: First API trigger
- For no filter: First trigger of any kind
- Used for UI display of trigger details

**`status`** (recalculated):
- Runtime status based on message and schedule state
- May differ from database `status` field
- See [Message Get](./message-get.md) for status calculation logic

---

## Examples

### Example 1: List all campaigns (basic)

**Description**: Get all campaigns with default sorting

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/all" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012"
```

**Response** (200):
```json
{
  "iTotalRecords": 25,
  "iTotalDisplayRecords": 25,
  "aaData": [
    {
      "_id": "...",
      "status": "draft",
      "info": {"title": "Draft Campaign"}
    },
    {
      "_id": "...",
      "status": "scheduled",
      "info": {"title": "New Year Campaign"}
    }
  ]
}
```

### Example 2: List with pagination

**Description**: Get page 2 (records 50-99) of campaigns

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/all" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "iDisplayStart=50" \
  -d "iDisplayLength=50"
```

**Response** (200):
```json
{
  "iTotalRecords": 150,
  "iTotalDisplayRecords": 150,
  "aaData": [
    { "_id": "...", "info": {"title": "Campaign 51"} },
    { "_id": "...", "info": {"title": "Campaign 52"} }
  ]
}
```

### Example 3: Filter by trigger type (event campaigns)

**Description**: List only event-triggered campaigns

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/all" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "kind=[\"event\"]"
```

**Response** (200):
```json
{
  "iTotalRecords": 12,
  "aaData": [
    {
      "_id": "...",
      "triggers": [{"kind": "event", "events": ["purchase"]}],
      "triggerObject": {"kind": "event", "events": ["purchase"]}
    }
  ]
}
```

### Example 4: Filter by platform (iOS only)

**Description**: List iOS campaigns

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/all" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "platform=i"
```

**Response** (200):
```json
{
  "iTotalRecords": 45,
  "aaData": [
    {
      "_id": "...",
      "platforms": ["i"],
      "info": {"title": "iOS Campaign"}
    },
    {
      "_id": "...",
      "platforms": ["i", "a"],
      "info": {"title": "Multi-platform Campaign"}
    }
  ]
}
```

### Example 5: Search campaigns

**Description**: Search for campaigns containing "sale" in message or title

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/all" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "sSearch=sale"
```

**Response** (200):
```json
{
  "iTotalRecords": 5,
  "aaData": [
    {
      "_id": "...",
      "contents": [{
        "message": "Big sale this weekend!",
        "title": "Weekend Sale"
      }]
    }
  ]
}
```

### Example 6: Sort by sent count

**Description**: List campaigns sorted by sent count descending

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/all" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "iSortCol_0=2" \
  -d "sSortDir_0=desc"
```

**Response** (200):
```json
{
  "iTotalRecords": 25,
  "aaData": [
    {
      "_id": "...",
      "result": {"sent": 50000},
      "info": {"title": "Popular Campaign"}
    },
    {
      "_id": "...",
      "result": {"sent": 35000},
      "info": {"title": "Another Campaign"}
    }
  ]
}
```

### Example 7: Filter by status (active only)

**Description**: List only active automated campaigns

**Request** (GET):
```bash
curl -X GET "https://your-server.com/o/push/message/all" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=507f1f77bcf86cd799439012" \
  -d "status=active"
```

**Response** (200):
```json
{
  "iTotalRecords": 8,
  "aaData": [
    {
      "_id": "...",
      "status": "active",
      "triggers": [{"kind": "event"}]
    }
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
| `auto` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `api` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `multi` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `rec` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Schedule limit` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Deleted by default` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `No field selection` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `Regex search` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `DataTables format` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `With pagination` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |
| `With search` | Endpoint data source | Stores endpoint-related records read or modified by this endpoint. |

---

## Related Endpoints

- [Message Get](./message-get.md) - Retrieve single campaign with full details
- [Message Create](./message-create.md) - Create new campaign
- [Message Update](./message-update.md) - Update existing campaign
- [Message Delete](./message-remove.md) - Delete campaign
- [Message Stats](./message-stats.md) - Get time-series statistics for campaign

---

## Error Handling

| Status Code | Condition | Response |
|-------------|-----------|----------|
| `200` | Success - messages listed | DataTables format with message array |
| `400` | Missing `app_id` | `{"errors": ["app_id is required"]}` |
| `400` | Invalid platform | `{"errors": ["Invalid platform"]}` |
| `400` | Invalid kind | `{"errors": ["Invalid trigger kind"]}` |
| `400` | Invalid sort direction | `{"errors": ["sSortDir_0 must be asc or desc"]}` |
| `500` | Database error | `{"kind": "ServerError", "errors": ["Server error"]}` |

---

## Implementation Notes

1. **DataTables format**: Response designed for jQuery DataTables library
2. **Aggregation-based**: Uses MongoDB aggregation for efficient filtering and sorting
3. **Schedule join**: Joins latest schedule only (limit 1) for performance
4. **Status recalculation**: Runtime status may differ from stored status
5. **Title resolution**: Computes title from info.title or contents[0].message
6. **Draft-first sorting**: Drafts always appear first in start date sort
7. **Backward compatibility**: Supports legacy filter parameters
8. **Deleted exclusion**: Excludes deleted by default (include with `removed=true`)
9. **Platform matching**: Matches if campaign includes specified platform
10. **Trigger extraction**: Adds `triggerObject` field for UI convenience
11. **Pagination support**: Standard DataTables pagination parameters
12. **Search regex**: Case-insensitive search in message and title fields

## Last Updated

February 2026
