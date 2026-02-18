---
sidebar_label: "Omit Segments"
---

# Views - Omit Segments

## Endpoint

```text
/i/views?method=omit_segments
```

## Overview

Stores a list of view segments to omit and removes related segmented view data for the app.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `views` `Delete` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `omit_segments`. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | Target app ID. |
| `omit_list` | JSON String (Array) | Yes | Array of segment keys to omit. Example: `["platform","device"]` |

### `omit_list` Array Structure

| Element type | Required | Description |
|---|---|---|
| String | Yes | Segment key to omit (for example `platform`, `device`, `app_version`). |

## Response

### Success Response

```json
{
  "result": "Success"
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `result` | String | Operation result message. |

### Error Responses

- `400`

```json
{
  "result": "Missing request parameter: app_id"
}
```

- `400`

```json
{
  "result": "Cannot parse  parameter: omit_list"
}
```

- `400`

```json
{
  "result": "Invalid request parameter: omit_list"
}
```

- `400`

```json
{
  "result": "Nothing is passed for omiting"
}
```

- `400`

```json
{
  "result": "Updating database failed"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Omit update success | `omit_list` is valid array and update succeeds | Updates `views` root doc (`omit` + unsets segment maps), deletes related segmented `app_viewdata` docs. | Wrapped message: `{ "result": "Success" }` |
| Omit update failure | Parse/validation/update error | Stops with message from validation/update path. | Wrapped error message. |

### Impact on Other Data

- Updates `countly.views` root document (`omit` and `segments.*` cleanup).
- Deletes matching segmented entries from `countly.app_viewdata`.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `view_segments_ommit` | Omit operation starts after root update | `{ update: <omit_list> }` |
| `view_segments_ommit_complete` | Omit processing finishes | `{ app_id, update, error? }` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and access rights for delete validation. |
| `countly.apps` | App validation/context loading | Validates `app_id` for operation scope. |
| `countly.views` | Omit configuration storage | Writes `omit` list and unsets omitted segment maps. |
| `countly.app_viewdata` | Segmented metric cleanup | Deletes segment-scoped viewdata documents for omitted segment keys. |

---

## Examples

### Omit platform and device segments

```text
/i/views?
  method=omit_segments&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  omit_list=["platform","device"]
```

### Omit app version segment

```text
/i/views?
  method=omit_segments&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  omit_list=["app_version"]
```

## Operational Considerations

- Omit changes affect future segmented processing and also clean existing segmented docs for omitted keys.
- Large omit lists may trigger larger cleanup workloads in `app_viewdata`.

## Related Endpoints

- [Views - Query](o-views.md)
- [Views - Rename](i-views-rename.md)
- [Views - Delete](i-views-delete.md)

## Last Updated

2026-02-17
