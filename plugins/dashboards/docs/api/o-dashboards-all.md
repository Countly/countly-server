---
sidebar_label: "Dashboard List"
---

# Dashboards - Read All

## Endpoint

```text
/o/dashboards/all
```

## Overview

Returns dashboards available to the current user. For full mode, each dashboard is enriched with widget metadata, app summaries, owner info, and editability flags.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

No separate feature permission flag is checked. Access is derived from dashboard ownership/share rules and user role.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `just_schema` | Boolean String | No | Truthy value enables schema-only mode (returns minimal dashboard fields). |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `dashboards.allow_public_dashboards` | `true` | Filtering | If enabled, dashboards with `share_with=all-users` are included for non-admin users; if disabled, they are excluded unless otherwise shared. |

## Response

### Success Response

Full mode:

```json
[
  {
    "_id": "65e1f3d2a4f41a5f6f6d7701",
    "name": "Executive Overview",
    "owner_id": "65dc6a52a2f7156eb2576f10",
    "owner": {
      "_id": "65dc6a52a2f7156eb2576f10",
      "full_name": "Product Lead",
      "email": "lead@company.com"
    },
    "share_with": "selected-users",
    "is_owner": true,
    "is_editable": true,
    "widgets": [
      {
        "_id": "65e1f5f8a4f41a5f6f6d7703",
        "widget_type": "analytics"
      }
    ],
    "apps": [
      {
        "_id": "6991c75b024cb89cdc04efd2",
        "name": "Production App"
      }
    ]
  }
]
```

Schema-only mode:

```json
[
  {
    "_id": "65e1f3d2a4f41a5f6f6d7701",
    "name": "Executive Overview",
    "owner_id": "65dc6a52a2f7156eb2576f10",
    "created_at": 1739971200000,
    "is_owner": true
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]._id` | String | Dashboard ID. |
| `[].name` | String | Dashboard name. |
| `[].owner_id` | String | Owner member ID. |
| `[].owner` | Object | Owner profile details (full mode). |
| `[].is_owner` | Boolean | Whether current user owns this dashboard (or is global admin). |
| `[].is_editable` | Boolean | Whether current user can edit this dashboard (full mode). |
| `[].widgets` | Array | Widget metadata array (full mode). |
| `[].apps` | Array | App summary array derived from widget app references (full mode). |

### Error Responses

This handler returns `[]` for many internal error branches instead of explicit error payloads.

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Full mode | `just_schema` not provided or falsy | Applies access filter, enriches each dashboard with widget/app/owner/editability data. | Raw array of enriched dashboard objects |
| Schema-only mode | `just_schema` truthy | Applies access filter and returns minimal dashboard fields. | Raw array of minimal dashboard objects |

### Impact on Other Data

- Read-only endpoint; no data writes.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.dashboards` | Dashboard listing and access filtering | Reads dashboard documents with ownership/sharing filters. |
| `countly.widgets` | Widget metadata enrichment | Reads widgets referenced by each dashboard. |
| `countly.apps` | App summary enrichment | Reads app documents referenced by widget app IDs. |
| `countly.members` | Authentication and owner info enrichment | Reads current member context for access filtering and owner profile fields for enrichment. |

---

## Examples

### Read all accessible dashboards (full mode)

```text
/o/dashboards/all
```

### Read schema only

```text
/o/dashboards/all?
  just_schema=true
```

## Limitations

- `just_schema` is evaluated by truthiness; values like `1` also activate schema-only mode.
- On many internal errors, handler returns an empty array instead of structured error details.

## Related Endpoints

- [Dashboards - Read](o-dashboards.md)
- [Dashboards - Read Widget](o-dashboards-widget.md)

## Last Updated

2026-02-17
