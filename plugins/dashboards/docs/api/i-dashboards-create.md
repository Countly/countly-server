---
sidebar_label: "Dashboard Create"
---

# Dashboards - Create

## Endpoint

```text
/i/dashboards/create
```

## Overview

Creates a dashboard with sharing settings and optional auto-refresh. You can also duplicate widgets from an existing dashboard using `copy_dash_id`.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

No separate feature permission flag is checked in this handler. Creation is available to authenticated users, but sharing-related behavior is gated by sharing configuration and user role restrictions.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Dashboard name. |
| `share_with` | String | Yes | Sharing mode: `all-users`, `selected-users`, or `none`. |
| `shared_email_edit` | JSON String (Array) | No | JSON-stringified list of emails with edit access. |
| `shared_email_view` | JSON String (Array) | No | JSON-stringified list of emails with view access. |
| `shared_user_groups_edit` | JSON String (Array) | No | JSON-stringified list of group IDs with edit access. |
| `shared_user_groups_view` | JSON String (Array) | No | JSON-stringified list of group IDs with view access. |
| `theme` | String or Number | No | Dashboard theme value. |
| `use_refresh_rate` | Boolean String | No | If set and not `false`, enables refresh rate processing. |
| `refreshRate` | Number | No | Refresh interval in minutes. Values below `5` are clamped to `5`. |
| `send_email_invitation` | Boolean String | No | When `true`, sends share invitation emails after create. |
| `copy_dash_id` | String | No | Existing dashboard ID to duplicate widgets from. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

### Array Parameter Structure

Each sharing array parameter must decode to a JSON array. Examples:

- `shared_email_edit`: `["editor@company.com"]`
- `shared_user_groups_view`: `["65dc6a52a2f7156eb2576f00"]`

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `dashboards.allow_public_dashboards` | `true` | Validation | If `false`, `share_with=all-users` is rejected with `400` and `Public dashboards are disabled`. |
| `dashboards.sharing_status` | `true` | Validation | If disabled, non-eligible users cannot create shared dashboards and receive `sharing_denied`. |

## Response

### Success Response

```json
"65e1f3d2a4f41a5f6f6d7701"
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root value)` | String | Created dashboard ID. |
| `error` | Boolean | Present when sharing is denied. |
| `sharing_denied` | Boolean | `true` when user cannot apply requested sharing configuration. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter: name"
}
```

- `400`

```json
{
  "result": "Missing parameter: share_with"
}
```

- `400`

```json
{
  "result": "Parameter needs to be an array: shared_email_edit"
}
```

- `400`

```json
{
  "result": "Public dashboards are disabled"
}
```

- `200` (sharing denied branch)

```json
{
  "error": true,
  "sharing_denied": true
}
```

- `500`

```json
{
  "result": "Failed to create dashboard"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Standard create | No `copy_dash_id` | Validates input and inserts one dashboard document. | Raw root string dashboard ID |
| Duplicate from existing | `copy_dash_id` provided | Validates source dashboard access, clones source widgets, inserts new dashboard with cloned widget IDs. | Raw root string dashboard ID |
| Sharing denied | Sharing rules fail | Stops before insert. | Raw object with `error` and `sharing_denied` |

### Impact on Other Data

- Inserts a dashboard document into `countly.dashboards`.
- When `copy_dash_id` is used, inserts cloned widgets into `countly.widgets`.
- Optional invitation flow reads users from `countly.members` and sends emails.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `dashboard_added` | After dashboard insert succeeds | Created dashboard fields |
| `widget_added` | For each cloned widget in copy flow | Cloned widget payload |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.dashboards` | Dashboard storage | Inserts dashboard document with sharing, theme, refresh, and widget references. |
| `countly.widgets` | Widget duplication | Reads source widgets and inserts cloned widgets when `copy_dash_id` is used. |
| `countly.members` | Authentication and share invitation resolution | Reads authenticated member context; optionally reads recipient emails for group/all-user invitation expansion. |
| `countly.systemlogs` | Audit trail | Writes `dashboard_added` and `widget_added` entries via `/systemlogs`. |

---

## Examples

### Create private dashboard

```text
/i/dashboards/create?
  name=Executive Overview&
  share_with=none&
  theme=1
```

### Create selected-user dashboard with sharing lists

```text
/i/dashboards/create?
  name=Regional KPI Board&
  share_with=selected-users&
  shared_email_view=["viewer@company.com"]&
  shared_email_edit=["editor@company.com"]&
  shared_user_groups_view=["65dc6a52a2f7156eb2576f00"]
```

### Duplicate an existing dashboard

```text
/i/dashboards/create?
  name=Q2 Dashboard Copy&
  share_with=none&
  copy_dash_id=65e1f3d2a4f41a5f6f6d7701
```

## Operational Considerations

- Copy mode performs multiple reads and inserts (source dashboard + widgets + new widgets + dashboard insert). For large dashboards this is heavier than standard create.
- Invitation sending is asynchronous from the client perspective, but it still adds processing in the request path.

## Limitations

- Sharing arrays must parse as valid JSON arrays when provided.
- `refreshRate` is stored in seconds internally after conversion from minutes.

## Related Endpoints

- [Dashboards - Update](i-dashboards-update.md)
- [Dashboards - Read All](o-dashboards-all.md)

## Last Updated

2026-02-17
