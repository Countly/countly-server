---
sidebar_label: "User Crashes Read"
---

# /o?method=user_crashes

## Endpoint

```plaintext
/o?method=user_crashes
```


## Overview

Fetch list of crash groups that affected a specific user. Returns all crashes reported by an individual user with count and timestamp information.

---

## Authentication
- **Required Permission**: `Read` (crashes feature)
- **HTTP Method**: GET or POST
- **Content-Type**: application/x-www-form-urlencoded

---


## Permissions

- Required Permission: Read (crashes feature)

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `api_key` | String | Yes (or use auth_token) | API key for authentication |
| `app_id` | String | Yes | Application ID |
| `uid` | String | Yes | User ID/UID to fetch crashes for |
| `iDisplayStart` | Integer | No | Record offset for pagination (default: 0) |
| `iDisplayLength` | Integer | No | Records per page (default: -1, all records) |
| `iSortCol_0` | Integer | No | Sort column index (0=group, 1=reports, 2=last) |
| `sSortDir_0` | String | No | Sort direction (asc, desc) |

---

## Response

### Success Response

```json
{
  "sEcho": "1",
  "iTotalRecords": 12,
  "iTotalDisplayRecords": 12,
  "aaData": [
    {
      "group": "crash_group_id",
      "reports": 5,
      "last": 1707123456789
    },
    {
      "group": "crash_group_id_2",
      "reports": 2,
      "last": 1707112345678
    }
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

## Examples

### Example 1: Get all crashes for a user

**Request**:
```bash
curl -X GET "https://your-server.com/o?method=user_crashes" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d "uid=user_123"
```

### Example 2: Get paginated user crashes with sorting

**Request**:
```bash
curl -X GET "https://your-server.com/o?method=user_crashes" \
  -d "api_key=YOUR_API_KEY" \
  -d "app_id=YOUR_APP_ID" \
  -d "uid=user_123" \
  -d "iDisplayStart=0" \
  -d "iDisplayLength=20" \
  -d "iSortCol_0=1" \
  -d "sSortDir_0=desc"
```

---

## Processing Details

The endpoint:
1. Validates uid parameter
2. Queries `app_crashusers` collection for user's crash records
3. Supports DataTables protocol parameters (iDisplayStart, iDisplayLength, iSortCol_0, sSortDir_0)
4. Returns paginated list of crash groups associated with the user

---


## Behavior/Processing

- Validates authentication, permissions, and request payloads before processing.
- Executes the endpoint-specific operation described in this document and returns the response shape listed above.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `app_crashusers` | User/member aggregates | Stores user and member records used by this endpoint. |

---

## Error Handling

| Status | Message | Cause |
|--------|---------|-------|
| 401 | Unauthorized | Insufficient read permissions |
| 400 | Please provide user uid | uid parameter missing |
| 500 | Server error | Database failure |

---

## Related Endpoints

- [/o?method=crashes](./o-crashes-list.md) - Get all crash groups in app
- [/o?method=reports](./o-reports.md) - Get specific crash report details

## Last Updated

February 2026
