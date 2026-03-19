---
sidebar_label: "Report Status Update"
---

# Reports - Report Status Update

## Endpoint

```plaintext
/i/reports/status
```

## Overview

Updates `enabled` status for one or more reports in a bulk operation.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `reports` `Update` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | App ID used by permission validation. |
| `args` | String (JSON Object) | Yes | Status map where keys are report IDs and values are booleans. |
| `args.[reportId]` | Boolean | Yes | `true` to enable, `false` to disable. |

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
| `result` | String | `Success` when bulk execution branch completes without MongoDB error. |

### Error Responses

- `200`

```json
{
  "result": "database error text"
}
```

Standard authentication/authorization errors from update validation can also be returned.

## Behavior/Processing

- Parses `args` JSON before route execution.
- Builds unordered bulk operation on `countly.reports`.
- For each key in `args`, applies update `{ $set: { enabled: args[id] } }`.
- Executes bulk only when at least one operation exists.

### Impact on Other Data

- Updates `enabled` field on report documents in `countly.reports`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Report storage | Bulk updates `enabled` field for provided report IDs. |

## Examples

### Disable two reports in one call

```plaintext
/i/reports/status?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  args={"6262742dbf7392a8bfd8c1f6":false,"6262742dbf7392a8bfd8c1f7":false}
```

## Limitations

- Endpoint does not return a response when `args` is empty (`{}`), because no bulk operation is executed.
- This endpoint updates by report ID only and does not apply ownership filter inside the update query.

## Related Endpoints

- [Reports - Report Update](i-reports-update.md)
- [Reports - Reports Read](o-reports-all.md)

## Last Updated

2026-03-07
