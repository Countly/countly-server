---
sidebar_label: "Message List"
---

# /o/push/message/all

## Endpoint

```plaintext
/o/push/message/all
```

Ⓔ Enterprise Only

## Overview

Returns push messages for one trigger group at a time with DataTables-style pagination and sorting.

---

## Authentication

This endpoint requires authentication and uses `read-permission validation`.

Supported authentication methods:
- Query parameter: `api_key`
- Query parameter: `auth_token`
- Header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `Read` permission for Push Notifications.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes* | API key authentication |
| `auth_token` | String | Yes* | Session token authentication |
| `app_id` | ObjectID | Yes | App ID |
| `auto` | BooleanString | No | If `true`, returns automated messages (event/cohort triggers) |
| `api` | BooleanString | No | If `true`, returns API-triggered messages |
| `removed` | BooleanString | No | If `true`, includes deleted messages |
| `sSearch` | String | No | Regex search term for `contents.message` and `contents.title` |
| `iDisplayStart` | IntegerString | No | Offset for pagination |
| `iDisplayLength` | IntegerString | No | Page size (`-1` means no limit) |
| `iSortCol_0` | String | No | Sort column index: `0=title`, `1=status`, `2=sent`, `3=actioned`, `4=created`, `5=trigger.start` |
| `sSortDir_0` | String | No | Sort direction: `asc` or `desc` |
| `sEcho` | String | No | Echo value returned in response |
| `status` | String | No | Filter by message status |

`*` Provide either `api_key` or `auth_token`.

## Response

### Success Response

```json
{
  "sEcho": "1",
  "iTotalRecords": 2,
  "iTotalDisplayRecords": 2,
  "aaData": [
    {
      "_id": "67cab1234d1e2a001f3b4567",
      "status": "scheduled",
      "platforms": ["i", "a"],
      "info": {
        "title": "Welcome campaign",
        "created": "2026-02-12T10:00:00.000Z",
        "lastDate": "2026-02-14T10:00:00.000Z"
      },
      "result": {
        "sent": 1250,
        "actioned": 238
      },
      "triggerObject": {
        "kind": "plain",
        "start": "2026-02-14T10:00:00.000Z"
      }
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `sEcho` | String | Echo value from request |
| `iTotalRecords` | Number | Total matched messages |
| `iTotalDisplayRecords` | Number | Same total used by DataTables |
| `aaData` | Array of objects | Message rows returned by aggregation |
| `aaData[].triggerObject` | Object | Trigger object selected for the current group (`plain`, `api`, or automated) |
| `aaData[].info.lastDate` | String | Computed date used in sorting (finished date or trigger start) |

### Error Responses

`400 Bad Request`

```json
{
  "result": {
    "errors": ["app_id must be a valid ObjectID"]
  }
}
```

---

## Behavior/Processing

1. Builds base query with `app_id` and non-deleted state (unless `removed=true`).
2. Trigger group is chosen exclusively:
- `auto=true` => `triggers.kind in [Event, Cohort]`
- `api=true` => `triggers.kind = API`
- otherwise => `triggers.kind = Plain`
3. Applies optional search and status filters.
4. Runs an aggregation pipeline with `$facet` to return total + page data.
5. Adds computed fields like `info.title`, `triggerObject`, and `info.lastDate`.

### Impact on Other Data

This endpoint is read-only and does not modify data.

## Database Collections

| Collection | Purpose | Key Fields |
|---|---|---|
| `countly.messages` | Source of push message documents | `_id`, `app`, `triggers`, `status`, `contents`, `result`, `info` |

---

## Examples

### List plain (scheduled) messages

```plaintext
https://your-server.com/o/push/message/all
  ?api_key=YOUR_API_KEY
  &app_id=6991c75b024cb89cdc04efd2
  &iDisplayStart=0
  &iDisplayLength=20
  &iSortCol_0=5
  &sSortDir_0=desc
```

### List automated messages only

```plaintext
https://your-server.com/o/push/message/all
  ?api_key=YOUR_API_KEY
  &app_id=6991c75b024cb89cdc04efd2
  &auto=true
```

### List API-triggered messages including removed

```plaintext
https://your-server.com/o/push/message/all
  ?api_key=YOUR_API_KEY
  &app_id=6991c75b024cb89cdc04efd2
  &api=true
  &removed=true
  &status=sent
```

## Limitations

- `auto` and `api` are mutually exclusive in practice due to `if / else if` logic; if both are set, `auto` takes precedence.
- Sorting column index must map to supported internal columns (0-5).

---

## Related Endpoints

- [Push Notifications - Message Get](./message-get.md)
- [Push Notifications - Message Create](./message-create.md)
- [Push Notifications - Message Estimate](./message-estimate.md)

---

## Last Updated

2026-03-07
