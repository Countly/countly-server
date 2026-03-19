---
sidebar_label: "Views Query"
---

# Views - Query

## Endpoint

```text
/o?method=views
```

## Overview

Queries view analytics data in multiple modes, including table output, totals, export query generation, view-name listings, and selected-view graph data.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `views` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `views`. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Conditional | Required for non-global-admin users during read validation. |
| `action` | String | No | Query mode selector (see semantics table). |
| `period` | String | No | Standard Countly period value. |
| `segment` | String | No | Segment key used for segmented view data. |
| `segmentVal` | String | No | Segment value for `segment`. |
| `periodOffset` | Number | No | Client offset (minutes) used in period shift for selected actions. |
| `iDisplayStart` | Number | No | Pagination start index (`getTable`, `getTableNames`). |
| `iDisplayLength` | Number | No | Pagination length (`getTable`, `getTableNames`). |
| `iSortCol_0` | Number | No | Sort column index for table actions. |
| `sSortDir_0` | String | No | Sort direction (`asc` or `desc`). |
| `sSearch` | String | No | Search filter (`getTable`, `getTableNames`). |
| `selectedViews` | JSON String (Array) | Conditional | Required for default graph mode when `action` is not set. Example: `[{"view":"6991c75..._home","name":"Home"}]` |
| `bucket` | String | No | Graph bucket for default graph mode (for example `h`, `d`, `w`, `m`). |

## Parameter Semantics

| Field | Expected values | Behavior |
|---|---|---|
| `action` | `getTable`, `getExportQuery`, `getTableNames`, `get_view_count`, `getTotals`, `listNames`, empty | Switches response shape and processing branch. |
| `selectedViews` | JSON array of objects containing `view` IDs | Used only by default graph mode. If missing/empty, graph mode returns empty `data`. |
| `periodOffset` | Integer minutes | Adjusts effective period window used by some aggregations. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.request_threshold` | Server configuration | Processing flow | `getTotals` and default graph mode use long-task thresholding; response may include `running: true` while unique-count enrichment is still processing. |

## Response

### Success Response

`action=getTable`:

```json
{
  "sEcho": "1",
  "iTotalRecords": 2,
  "iTotalDisplayRecords": 2,
  "aaData": [
    {
      "_id": "6991c75b024cb89cdc04efd2_home",
      "view": "/home",
      "display": "Home",
      "url": "https://your-server.com/home",
      "t": 120,
      "u": 95,
      "d": 38,
      "s": 44,
      "e": 20,
      "b": 15,
      "br": 13,
      "scr": 67
    }
  ]
}
```

`action=getTotals`:

```json
{
  "_id": null,
  "t": 1540,
  "s": 730,
  "b": 188,
  "u": 521,
  "lu": "2026-02-17T11:13:03.000Z",
  "lu_diff": 42,
  "running": false
}
```

`action=getExportQuery`:

```json
{
  "db": "countly",
  "collection": "app_viewdata0f4f4d...",
  "pipeline": [
    {
      "$match": {
        "_id": {
          "$regex": "^6991c75b024cb89cdc04efd2_"
        }
      }
    }
  ],
  "projection": {
    "_id": true,
    "view": true,
    "url": true,
    "display": true,
    "u": true,
    "t": true
  }
}
```

Default graph mode (`action` empty):

```json
{
  "appID": "6991c75b024cb89cdc04efd2",
  "data": {
    "6991c75b024cb89cdc04efd2_home": {
      "no-segment": {
        "2026": {
          "2": {
            "17": {
              "t": 23,
              "u": 18
            }
          }
        }
      }
    }
  }
}
```

`action=get_view_count`:

```json
{
  "result": 128
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `sEcho` | String | Echo value for table-compatible responses. |
| `iTotalRecords` | Number | Total records for table actions. |
| `iTotalDisplayRecords` | Number | Filtered total for table actions. |
| `aaData` | Array | Table rows for `getTable`/`getTableNames`. |
| `db` | String | Export source DB for `getExportQuery`. |
| `collection` | String | Export source collection for `getExportQuery`. |
| `pipeline` | Array | Aggregation pipeline for `getExportQuery`. |
| `projection` | Object | Projection map for `getExportQuery`. |
| `result` | Number | View count for `get_view_count` (returned as wrapped `result`). |
| `appID` | String | App ID in default graph mode. |
| `data` | Object or Array | Graph payload (default mode) or selected-action data payloads. |
| `t`, `s`, `b`, `u` | Number | Totals response metrics (`getTotals`). |
| `lu` | String | Latest update timestamp (`getTotals`). |
| `lu_diff` | Number | Seconds since latest update (`getTotals`). |
| `running` | Boolean | Indicates totals enrichment is still running (`getTotals`). |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

- `401`

```json
{
  "result": "No app_id provided"
}
```

- `401`

```json
{
  "result": "User does not have right"
}
```

- `400`

```json
{
  "result": "Missing request parameter: app_id"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Table mode | `action=getTable` | Aggregates view metrics, joins `app_viewsmeta`, applies search/sort/pagination. | Raw object with `aaData` and table totals. |
| Export mode | `action=getExportQuery` | Builds export pipeline/projection and target collection metadata. | Raw object with `db`, `collection`, `pipeline`, `projection`. |
| Table names mode | `action=getTableNames` | Reads names/display values from `app_viewsmeta` with sort/pagination. | Raw object with `aaData` and table totals. |
| Count mode | `action=get_view_count` | Counts view-meta documents for app. | Wrapped object: `{ "result": 42 }` (number). |
| Totals mode | `action=getTotals` | Aggregates totals and unique counts via long-task-enabled query runner flow. | Raw totals object (may include `running`). |
| Names list mode | `action=listNames` | Returns all view names/display values when total count is below limit. | Raw array. |
| Graph mode | `action` missing/empty | Builds selected-view time models and applies unique-count enrichment. | Raw object `{ appID, data }`. |

### Impact on Other Data

- Read-only endpoint. It does not create, update, or delete records.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account, lock state, and feature access. |
| `countly.apps` | App validation/context loading | Validates app context for read access and period handling. |
| `countly.app_viewdata` and `countly.app_viewdata{sha1(segment+appId)}` | View metric source data | Reads segmented and non-segmented view metric documents. |
| `countly.app_viewsmeta` | View metadata lookup | Reads view names, URLs, and custom display names. |
| `countly_drill.drill_events` | Unique-count/graph enrichment input | Reads `[CLY]_view` drill events for totals/graph unique calculations. |

---

## Examples

### Table mode

```text
/o?
  method=views&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  action=getTable&
  period=30days&
  iDisplayStart=0&
  iDisplayLength=10
```

### Totals mode

```text
/o?
  method=views&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  action=getTotals&
  period=7days
```

### Graph mode for selected views

```text
/o?
  method=views&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=30days&
  selectedViews=[{"view":"6991c75b024cb89cdc04efd2_home","name":"/home"}]
```

## Operational Considerations

- `getTotals` and graph mode may perform heavy unique-count enrichment and can report `running: true`.
- For large datasets, use pagination and targeted periods to reduce response size.

## Limitations

- `listNames` returns empty array when total view count is `10000` or higher.
- Graph mode requires `selectedViews` for non-empty data output.

## Related Endpoints

- [Views - Actions/Heatmap Read](o-actions.md)
- [Views - Rename](i-views-rename.md)
- [Views - Omit Segments](i-views-omit-segments.md)
- [Views - Delete](i-views-delete.md)

## Last Updated

2026-02-17
