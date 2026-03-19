---
sidebar_label: "Report Update"
---

# Reports - Report Update

## Endpoint

```plaintext
/i/reports/update
```

## Overview

Updates an existing report definition.

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
| `args` | String (JSON Object) | Yes | Update payload. |
| `args._id` | String | Yes | Target report ID. |
| `args.apps` | Array of Strings | Yes (practical) | App list validated against user access for non-global-admin users. |
| `args.frequency` | String | No | Accepted values: `daily`, `weekly`, `monthly`; other values are removed from update. |
| `args.day` | Number/String | No | Parsed to integer when provided. |
| `args.hour` | Number/String | No | Parsed to integer when provided. |
| `args.minute` | Number/String | No | Parsed to integer when provided. |
| `args.timezone` | String | No | Defaults to `Etc/GMT` if omitted. |

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
| `result` | String | `Success` when update operation completes. |

### Error Responses

- `401`

```json
{
  "result": "User does not have right to access this information"
}
```

- `200`

```json
{
  "result": "database error text"
}
```

Standard authentication/authorization errors from update validation can also be returned.

## Behavior/Processing

- Parses `args` JSON before route execution.
- Removes `_id` from update payload and uses it only in query.
- Removes `frequency` from update when value is not `daily|weekly|monthly`.
- Parses `day/hour/minute` to integers when provided.
- Applies timezone conversion helper (`convertToTimezone`).
- Enforces app-level access for non-global-admin users via `args.apps` check.
- Loads current report, updates report with `$set`, logs `reports_edited` action.

### Impact on Other Data

- Updates one report document in `countly.reports`.
- Adds one audit entry in `countly.systemlogs` on success.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.reports` | Report storage | Reads existing report and updates target document. |
| `countly.systemlogs` | Audit trail | Receives `reports_edited` action with before/update payload. |

## Examples

### Update schedule and recipients

```plaintext
/i/reports/update?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  args={"_id":"6262742dbf7392a8bfd8c1f6","apps":["6991c75b024cb89cdc04efd2"],"frequency":"monthly","day":1,"hour":8,"minute":30,"emails":["ops@company.com"]}
```

## Limitations

- Although this is an update endpoint, code expects `args.apps` for permission checks; omitting `apps` can break update execution.
- Ownership filtering for update is enforced by report query (`user` constraint for non-global-admins).

## Related Endpoints

- [Reports - Report Create](i-reports-create.md)
- [Reports - Report Delete](i-reports-delete.md)

## Last Updated

2026-03-07
