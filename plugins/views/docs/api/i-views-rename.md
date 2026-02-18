---
sidebar_label: "Rename"
---

# Views - Rename

## Endpoint

```text
/i/views?method=rename_views
```

## Overview

Sets or clears custom display names for one or more views by updating view metadata records.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `views` `Update` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `rename_views`. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | Target app ID. |
| `data` | JSON String (Array) | Yes | Array of rename operations. Example: `[{"key":"6991..._home","value":"Home"}]` |

### `data` Array Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | String | Yes | View `_id` to update. |
| `value` | String | Yes | Custom display name. Use empty string to remove custom display name. |

Example payload:

```json
[
  {
    "key": "6991c75b024cb89cdc04efd2_home",
    "value": "Home Page"
  },
  {
    "key": "6991c75b024cb89cdc04efd2_checkout",
    "value": ""
  }
]
```

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
| `result` | String | Success message when bulk update completes. |

### Error Responses

- `400`

```json
{
  "result": "Missing request parameter: data"
}
```

- `400`

```json
{
  "result": "Invalid request parameter: data"
}
```

- `400`

```json
{
  "result": "Nothing to update"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Set display name | `value` is non-empty string | Adds bulk `$set` update for `display` field in `app_viewsmeta`. | Wrapped success/error message. |
| Clear display name | `value` is empty string | Adds bulk `$unset` update for `display` field in `app_viewsmeta`. | Wrapped success/error message. |

### Impact on Other Data

- Updates only `display` metadata; view IDs and collected analytics data remain unchanged.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account and access rights for update validation. |
| `countly.apps` | App validation/context loading | Validates `app_id` for update scope. |
| `countly.app_viewsmeta` | View metadata updates | Sets or unsets `display` on matched view documents. |

---

## Examples

### Rename multiple views

```text
/i/views?
  method=rename_views&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  data=[{"key":"6991c75b024cb89cdc04efd2_home","value":"Home Page"},{"key":"6991c75b024cb89cdc04efd2_checkout","value":"Checkout"}]
```

### Remove custom display name

```text
/i/views?
  method=rename_views&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  data=[{"key":"6991c75b024cb89cdc04efd2_home","value":""}]
```

## Operational Considerations

- Endpoint uses unordered bulk updates, so multiple rename operations are applied in one DB execution.

## Related Endpoints

- [Views - Omit Segments](i-views-omit-segments.md)
- [Views - Delete](i-views-delete.md)

## Last Updated

2026-02-17
