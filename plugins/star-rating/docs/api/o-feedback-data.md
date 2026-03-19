---
sidebar_label: "Get Feedback Data"
---

# Star Rating - Get Feedback Data

## Endpoint

```plaintext
/o/feedback/data
```

## Overview

Returns tabular star-rating submissions from drill events with filtering, sorting, and paging.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `star_rating` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | App ID for drill query. |
| `period` | String/Array | Yes | Standard Countly period value/range used to build timestamp filter. |
| `widget_id` | String | No | Filters by widget ID (`n` field). |
| `rating` | Number | No | Filters by `sg.rating`. |
| `version` | String | No | Filters by `sg.app_version`. |
| `platform` | String | No | Filters by `sg.platform`. |
| `device_id` | String | No | Filters by `did`. |
| `uid` | String | No | Filters by `uid`. |
| `sSearch` | String | No | Text search term (`$text`). |
| `iDisplayStart` | Number | No | Pagination offset. |
| `iDisplayLength` | Number | No | Pagination size. |
| `iSortCol_0` | Number | No | Sort column index (`0..3`). |
| `sSortDir_0` | String | No | Sort direction (`asc`/`desc`). |
| `sEcho` | String | No | Echo value returned in response. |

## Response

### Success Response

```json
{
  "sEcho": "1",
  "iTotalRecords": 2,
  "iTotalDisplayRecords": 2,
  "aaData": [
    {
      "_id": "67a3d2f5c1a23b0f4d6c0301",
      "sg": {
        "rating": 5,
        "comment": "Great UX",
        "email": "user@example.com"
      },
      "uid": "user_123",
      "did": "device_123",
      "ts": 1707123456789
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `sEcho` | String | Echo value from request. |
| `iTotalRecords` | Number | Total rows matching filters. |
| `iTotalDisplayRecords` | Number | Same as `iTotalRecords` in this implementation. |
| `aaData` | Array | Drill event rows for star-rating submissions. |
| `aaData[].sg.rating` | Number | Submitted rating. |
| `aaData[].sg.comment` | String | Submitted comment. |
| `aaData[].sg.email` | String | Submitted email when provided. |
| `aaData[].uid` | String | User ID associated with submission. |
| `aaData[].did` | String | Device ID associated with submission. |
| `aaData[].ts` | Number | Event timestamp. |

### Error Responses

- `400`

```json
{
  "result": "Invalid column index for sorting"
}
```

- `500`

```json
{
  "result": "cursor/database error"
}
```

Standard authentication/authorization errors from read validation can also be returned.

## Behavior/Processing

- Reads from `drill_events` collection in drill database with fixed event key `[CLY]_star_rating`.
- Applies filter fields on `sg.*`, `uid`, `did`, and period timestamp range.
- Supports DataTables-style sort/pagination parameters.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_drill.drill_events` | Feedback event source | Reads star-rating events (`e="[CLY]_star_rating"`). |

## Examples

### Read feedback submissions for last 30 days

```plaintext
/o/feedback/data?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=30days&
  iDisplayStart=0&
  iDisplayLength=50
```

## Related Endpoints

- [Star Rating - Record Feedback](i-feedback-input.md)

## Last Updated

2026-03-07
