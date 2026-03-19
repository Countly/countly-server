---
sidebar_label: "Report Delete"
---

# Reports - Report Delete

## Endpoint

```plaintext
/i/reports/delete
```

## Overview

Deletes a report definition.

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `reports` `Delete` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Yes | App ID used by permission validation. |
| `args` | String (JSON Object) | Yes | Must include report `_id`. |
| `args._id` | String | Yes | Target report ID. |

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
| `result` | String | `Success` when delete operation finishes. |

### Error Responses

- `200`

```json
{
  "result": "Not enough args"
}
```

- `200`

```json
{
  "result": "Error deleting report"
}
```

Standard authentication/authorization errors from delete validation can also be returned.

## Behavior/Processing

- Parses `args` JSON before route execution.
- Validates `_id` format before deleting.
- Uses owner-scoped query for non-global-admin users.
- Reads report for audit payload, then removes it from `countly.reports`.
- If report existed, emits `reports_deleted` system log action.

### Impact on Other Data

- Removes one report document from `countly.reports`.
- Adds one audit entry in `countly.systemlogs` when deleted report document is found.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Report storage | Reads and removes target report document. |
| `countly.systemlogs` | Audit trail | Receives `reports_deleted` action for existing report deletions. |

## Examples

### Delete one report

```plaintext
/i/reports/delete?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  args={"_id":"6262742dbf7392a8bfd8c1f6"}
```

## Limitations

- Endpoint can return `Success` even when no matching report was found/removed.

## Related Endpoints

- [Reports - Report Create](i-reports-create.md)
- [Reports - Report Update](i-reports-update.md)

## Last Updated

2026-03-07
