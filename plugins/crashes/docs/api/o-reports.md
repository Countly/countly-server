---
sidebar_label: "Reports Read"
---

# Crashes - Reports Read

## Endpoint

```plaintext
/o?method=reports
```

## Overview

Returns crash report documents by report id(s).

## Authentication

Countly API supports three authentication methods:

1. `api_key=YOUR_API_KEY`
2. `auth_token=YOUR_AUTH_TOKEN`
3. `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `crashes` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `reports`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Yes | App id. |
| `report_ids` | String (JSON Array) | No | List of report ids. |
| `report_id` | String | No | Single report id. Used when `report_ids` is not provided. |

## Response

### Success Response

```json
{
  "65f1f7b2ad5b9b001f12ab34": {
    "_id": "65f1f7b2ad5b9b001f12ab34",
    "a": "6991c75b024cb89cdc04efd2",
    "e": "[CLY]_crash",
    "n": "crash_group_1",
    "uid": "user-123"
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Report map keyed by report document id. |
| `{report_id}` | Object | Raw crash report document from drill events collection. |

### Error Responses

Standard authentication/authorization errors from read validation.

## Behavior/Processing

- If `report_ids` is present, endpoint parses it as JSON array.
- If `report_ids` is absent and `report_id` is present, endpoint creates a single-item list.
- Parse failures fall back to empty id list and return `{}`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly_drill.drill_events` | Crash report source | Reads crash reports where `a` is app id, `e` is `[CLY]_crash`, and `n` matches report ids. |

---

## Examples

### Read multiple reports

```plaintext
/o?method=reports&api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&report_ids=["65f1f7b2ad5b9b001f12ab34","65f1f7b2ad5b9b001f12ab35"]
```

### Read one report

```plaintext
/o?method=reports&api_key=YOUR_API_KEY&app_id=6991c75b024cb89cdc04efd2&report_id=65f1f7b2ad5b9b001f12ab34
```

## Related Endpoints

- [Crashes - Crash Groups Read](o-crashes-list.md)

## Last Updated

2026-03-05
