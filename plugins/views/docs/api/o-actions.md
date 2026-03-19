---
sidebar_label: "Actions or Heatmap"
---

# Views - Actions/Heatmap Read

## Endpoint

```text
/o/actions
```

## Overview

Returns view interaction points (click or scroll heatmap data) from drill events for the selected period and device-width range.

## Authentication

This endpoint supports two authentication modes:

1. Standard API authentication (`api_key` or `auth_token`) with `views` read access.
2. Heatmap token flow using `countly-token` header with `app_key`.

## Permissions

- Standard mode: requires `views` `Read` permission.
- Token mode: token must be valid for `/o/actions` and mapped app.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `view` | String | Yes | View name/path to fetch heatmap data for. |
| `device` | JSON String (Object) | Yes | Device-width filter object. Example: `{"minWidth":0,"maxWidth":1920}` |
| `period` | String | Yes | Allowed values: `month`, `day`, `yesterday`, `hour`, `Ndays`, or JSON range `[start,end]`. |
| `actionType` | String | Yes | Interaction type: `click` or `scroll`. |
| `segment` | String | No | Optional segment filter applied to `sg.segment`. |
| `api_key` | String | Conditional | Required for standard mode when `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required for standard mode when `api_key` is not provided. |
| `app_id` | String | Conditional | Required for standard mode read validation. |
| `app_key` | String | Conditional | Required for token mode (`countly-token` header). |

## Parameter Semantics

| Field | Expected values | Behavior |
|---|---|---|
| `device.minWidth` / `device.maxWidth` | Numbers `>= 0` | Used to filter interaction points by captured `sg.width`. Invalid values return `400`. |
| `actionType` | `click`, `scroll` | `click` matches by `up.lv` and includes `x`,`y`; `scroll` matches by `sg.view` and includes `y`. |
| `period` | Supported period string or JSON range | Invalid period format returns `400 Bad request parameter: period`. |

## Response

### Success Response

```json
{
  "types": [],
  "domains": [],
  "data": [
    {
      "c": 52,
      "sg": {
        "type": "click",
        "x": 640,
        "y": 280,
        "width": 1920,
        "height": 1080
      }
    },
    {
      "c": 41,
      "sg": {
        "type": "click",
        "x": 920,
        "y": 540,
        "width": 1920,
        "height": 1080
      }
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `types` | Array | Reserved array in response envelope (returned empty in this response path). |
| `domains` | Array | Reserved array in response envelope (returned empty in this response path). |
| `data` | Array | Matching heatmap interaction entries. |
| `data[].c` | Number | Interaction count for entry. |
| `data[].sg.type` | String | Interaction type (`click` or `scroll`). |
| `data[].sg.x` | Number | X coordinate (`click` mode only). |
| `data[].sg.y` | Number | Y coordinate. |
| `data[].sg.width` | Number | Captured viewport width. |
| `data[].sg.height` | Number | Captured viewport height. |

### Error Responses

- `401`

```json
{
  "result": "Please provide view for which to query data"
}
```

- `401`

```json
{
  "result": "User does not have view right for this application"
}
```

- `400`

```json
{
  "result": "Bad request parameter: device"
}
```

- `400`

```json
{
  "result": "Missing request parameter: period"
}
```

- `400`

```json
{
  "result": "Bad request parameter: period"
}
```

- `500`

```json
{
  "result": "Error fetching drill events"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Standard auth mode | No `countly-token` header | Uses `read-permission validation` then runs heatmap query. | Raw object: `{ types, data, domains }`. |
| Token auth mode | `countly-token` header present | Resolves app by `app_key`, verifies token, optionally extends token, then runs heatmap query. | Raw object: `{ types, data, domains }` (with token headers when extended). |
| Scroll mode | `actionType=scroll` | Matches `sg.view=[view]`, returns scroll positions (`y`). | Same raw object shape. |
| Click mode | `actionType=click` | Matches `up.lv=[view]`, returns click coordinates (`x`,`y`). | Same raw object shape. |

### Impact on Other Data

- Read-only endpoint. No collections are modified.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Standard-mode authentication | Reads member account and permission state via read validation. |
| `countly.apps` | Token-mode app resolution | Resolves app context from `app_key` and initializes app timezone context. |
| `countly_drill.drill_events` | Heatmap interaction source | Reads `[CLY]_action` drill entries matching period/view/device filters. |

---

## Examples

### Read click heatmap data

```text
/o/actions?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  view=/home&
  actionType=click&
  period=7days&
  device={"minWidth":0,"maxWidth":1920}
```

### Read scroll heatmap data with token mode

```text
/o/actions?
  app_key=YOUR_APP_KEY&
  view=/home&
  actionType=scroll&
  period=30days&
  device={"minWidth":320,"maxWidth":1440}
```

## Limitations

- `view`, `period`, and valid `device` JSON are required for successful heatmap queries.
- Output includes only matched points; unsupported or mismatched filters can return empty `data`.

## Related Endpoints

- [Views - Query](o-views.md)

## Last Updated

2026-02-17
