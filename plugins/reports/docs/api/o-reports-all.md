---
sidebar_label: "Reports Read"
---

# Reports - Reports Read

## Endpoint

```plaintext
/o/reports/all
```

## Overview

Returns reports visible to the authenticated user.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `reports` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | App id used by permission validation. |

## Response

### Success Response

```json
[
  {
    "_id": "6262742dbf7392a8bfd8c1f6",
    "title": "Monthly Analytics Report",
    "report_type": "core",
    "apps": [
      "615f0c4120543a8ed03a89b8"
    ],
    "emails": [
      "analytics@company.com"
    ],
    "frequency": "monthly",
    "timezone": "America/New_York",
    "user": "60afbaa84723f369db477fee",
    "isValid": true
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Report records visible to requester. |
| `[].isValid` | Boolean | Core reports are always `true`; non-core reports are validated via `/report/verify` hook. |

### Error Responses

Standard authentication/authorization errors from read validation.

## Behavior/Processing

- Non-global admins only receive reports they own or where their email appears in `emails`.
- Global admins receive all reports.
- Missing `report_type` defaults to `core` in output.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Reports source | Reads report definitions. |

---

## Examples

### Read reports for current user

```plaintext
/o/reports/all?api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2
```

## Related Endpoints

- [Reports - Create](i-reports-create.md)
- [Reports - Send](i-reports-send.md)

## Last Updated

2026-03-05
