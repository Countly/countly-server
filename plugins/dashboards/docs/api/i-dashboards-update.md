---
sidebar_label: "Dashboard Update"
---

# Dashboards - Update

## Endpoint

```text
/i/dashboards/update
```

## Overview

Updates dashboard metadata such as name, theme, sharing configuration, and refresh settings.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

No separate feature permission flag is checked. The handler enforces:

- authenticated user,
- dashboard visibility check,
- owner-only update for non-global-admin users.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `dashboard_id` | String | Yes | Dashboard ID (24-char ObjectId string). |
| `name` | String | Yes | Updated dashboard name. |
| `share_with` | String | Yes | Sharing mode: `all-users`, `selected-users`, or `none`. |
| `theme` | String or Number | No | Updated theme value. |
| `shared_email_edit` | JSON String (Array) | No | New edit email list. |
| `shared_email_view` | JSON String (Array) | No | New view email list. |
| `shared_user_groups_edit` | JSON String (Array) | No | New edit group list. |
| `shared_user_groups_view` | JSON String (Array) | No | New view group list. |
| `use_refresh_rate` | Boolean String | No | Enables refresh-rate processing when not `false`. |
| `refreshRate` | Number | No | Refresh interval in minutes; minimum persisted value is 5 minutes. |
| `send_email_invitation` | Boolean String | No | If `true`, invitations are sent to newly added recipients only. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

### Array Parameter Structure

Examples of decoded JSON arrays:

- `shared_email_view`: `["viewer@company.com"]`
- `shared_user_groups_edit`: `["65dc6a52a2f7156eb2576f00"]`

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `dashboards.allow_public_dashboards` | `true` | Validation | If `false`, `share_with=all-users` is rejected with `400` and `Public dashboards are disabled`. |
| `dashboards.sharing_status` | `true` | Processing flow | If disabled, sharing fields may not be updated for non-eligible users even when other dashboard fields are updated. |

## Response

### Success Response

```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `acknowledged` | Boolean | Database update operation acknowledgment. |
| `matchedCount` | Number | Number of matched dashboard documents. |
| `modifiedCount` | Number | Number of modified dashboard documents. |
| `error` | Boolean | Present in access-denied branch. |
| `dashboard_access_denied` | Boolean | `true` when user cannot view dashboard. |

### Error Responses

- `400`

```json
{
  "result": "Invalid parameter: dashboard_id"
}
```

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

- `400`

```json
{
  "result": "Dashboard with the given id doesn't exist"
}
```

- `500`

```json
{
  "result": "Failed to update dashboard"
}
```

- `200` (no dashboard access)

```json
{
  "error": true,
  "dashboard_access_denied": true
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Full metadata update | Valid inputs and owner/global-admin authorization | Applies dashboard field update and optional sharing updates, sends optional invitations, logs changes. | Raw DB update result object |
| Sharing-restricted update | `dashboards.sharing_status` does not allow sharing edits for user context | Updates base fields (for example `name`, `theme`) but skips share-list updates. | Raw DB update result object |
| Access denied | User fails view-access check | Stops before update. | Raw object with `error` and `dashboard_access_denied` |

### Impact on Other Data

- Updates dashboard document fields in `countly.dashboards`.
- Optional invitation flow reads `countly.members` to compute delta recipients.

## Audit & System Logs

| Action | Trigger | Payload |
|---|---|---|
| `dashboard_edited` | After successful dashboard update | `{ before, update }` object |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.dashboards` | Dashboard lookup and update | Reads existing dashboard and updates metadata/sharing/refresh fields. |
| `countly.members` | Authentication and optional invitation recipient expansion | Reads current member context; optionally reads recipient emails by group/all-user rules for invitation deltas. |
| `countly.systemlogs` | Audit trail | Writes `dashboard_edited` entry. |

---

## Examples

### Update dashboard name and theme

```text
/i/dashboards/update?
  dashboard_id=65e1f3d2a4f41a5f6f6d7701&
  name=Executive Dashboard - Q2&
  share_with=none&
  theme=2
```

### Update sharing lists

```text
/i/dashboards/update?
  dashboard_id=65e1f3d2a4f41a5f6f6d7701&
  name=Regional Dashboard&
  share_with=selected-users&
  shared_email_view=["viewer@company.com"]&
  shared_email_edit=["editor@company.com"]&
  shared_user_groups_view=["65dc6a52a2f7156eb2576f00"]
```

### Enable refresh rate

```text
/i/dashboards/update?
  dashboard_id=65e1f3d2a4f41a5f6f6d7701&
  name=Operational Monitor&
  share_with=none&
  use_refresh_rate=true&
  refreshRate=10
```

## Limitations

- For non-global-admin users, update uses owner filter; users with shared edit access but not ownership cannot update dashboard metadata.
- Update result object fields may vary slightly by MongoDB driver version.

## Related Endpoints

- [Dashboards - Create](i-dashboards-create.md)
- [Dashboards - Read](o-dashboards.md)

## Last Updated

2026-02-17
