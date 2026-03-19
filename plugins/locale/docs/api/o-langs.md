---
sidebar_label: "Languages Read"
---

# Locale - Languages Read

## Endpoint

```plaintext
/o?method=langs
```

## Overview

Returns language usage metrics for an app and selected period. Data is aggregated from locale metric documents and returned in Countly's standard time-object format.

## Authentication

Countly API supports three authentication methods:

1. **API Key** (parameter): `api_key=YOUR_API_KEY`
2. **Auth Token** (parameter): `auth_token=YOUR_AUTH_TOKEN`
3. **Auth Token** (header): `countly-token: YOUR_AUTH_TOKEN`


## Permissions

Requires `locale` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `langs`. |
| `api_key` | String | Yes (or use `auth_token`) | API key for authentication. |
| `auth_token` | String | No | Auth token as query parameter or `countly-token` header. |
| `app_id` | String | Conditionally required | Required for non-global users under read-permission validation. |
| `period` | String | No | Time range accepted by Countly period parser (default behavior follows shared fetch logic). |
| `timezone` | String | No | Timezone used for period calculations. |
| `action` | String | No | Optional mode switch. Use `refresh` to return only the latest refresh-focused slice instead of a full-period merge. |

## Response

### Success Response

```json
{
  "2026": {
    "2": {
      "17": {
        "langs": {
          "en": {
            "t": 24,
            "u": 18,
            "n": 6
          },
          "fr": {
            "t": 8,
            "u": 7,
            "n": 2
          }
        }
      }
    }
  },
  "meta": {
    "langs": [
      "en",
      "fr"
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Raw merged time object for locale metrics. |
| `{year}` | Object | Year bucket. |
| `{year}.{month}` | Object | Month bucket. |
| `{year}.{month}.{day}` | Object | Day bucket containing language metric entries. |
| `...langs.{lang_code}.t` | Number | Total sessions for language code in period slice. |
| `...langs.{lang_code}.u` | Number | Unique users for language code in period slice. |
| `...langs.{lang_code}.n` | Number | New users for language code in period slice. |
| `meta.langs` | Array | Language codes present in the dataset. |

### Error Responses

- `400`

```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

- `400`

```json
{
  "result": "Token not valid"
}
```

- `401`

```json
{
  "result": "No app_id provided"
}
```

- `401`

```json
{
  "result": "User does not exist"
}
```

- `401`

```json
{
  "result": "App does not exist"
}
```

- `401`

```json
{
  "result": "User does not have right"
}
```

- `401`

```json
{
  "result": "User is locked"
}
```

- `401`

```json
{
  "result": "Token is invalid"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Standard read | `action` is not `refresh` | Validates access and returns merged locale time-object data for the requested period. | Raw root object keyed by time buckets plus `meta`. |
| Refresh read | `action=refresh` | Validates access and returns refresh-focused fields (latest daily/weekly/monthly slices and metadata). | Raw root object with a reduced metric slice for fast refresh use. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account, role, lock state, and feature access rights. |
| `countly.apps` | App validation and context loading | Validates `app_id` and loads app timezone/country context for period handling. |
| `countly.langs` | Stores aggregated locale/language metrics | Reads language metric documents for the requested app and period. |

---

## Examples

### Read language metrics for current month

```plaintext
/o?method=langs&api_key=YOUR_API_KEY&app_id=YOUR_APP_ID&period=month
```

### Read language metrics for last 7 days

```plaintext
/o?method=langs&api_key=YOUR_API_KEY&app_id=YOUR_APP_ID&period=7days
```

## Limitations

- Metric granularity and shape follow shared Countly time-object fetch behavior.
- Empty dataset returns an empty object.

## Related Endpoints

- [Locale - Language Map Read](o-langmap.md)

## Last Updated

2026-02-17
