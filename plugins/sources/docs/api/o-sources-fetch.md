---
sidebar_label: "Traffic Sources Read"
---

# Sources - Traffic Sources Read

## Endpoint

```text
/o?method=sources
```

## Overview

Returns source-attribution metrics for the requested app and period, including normalized store/referrer values collected during ingest.

## Authentication

Countly API supports three authentication methods:

1. API key query parameter: `api_key=YOUR_API_KEY`
2. Auth token query parameter: `auth_token=YOUR_AUTH_TOKEN`
3. Auth token header: `countly-token: YOUR_AUTH_TOKEN`

## Permissions

Requires `sources` `Read` permission.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `method` | String | Yes | Must be `sources`. |
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Conditional | Required for non-global-admin users during read validation. |
| `period` | String | No | Standard Countly period value (for example `7days`, `30days`, `month`, `yesterday`). |
| `timezone` | String | No | Timezone used for period calculations. |
| `action` | String | No | Optional mode switch. Use `refresh` for refresh-focused partial output. |

## Parameter Semantics

### `period` values

The endpoint uses Countly's standard period parser. Common values include:

| Value | Meaning |
|---|---|
| `today` | Current day window |
| `yesterday` | Previous day |
| `7days` / `30days` / `60days` | Rolling day windows |
| `month` | Current month |
| `hour` | Hour-level window |
| `[start,end]` | Custom timestamp range (array form) |

### `action`

- Omit `action` for full period output.
- Use `action=refresh` for refresh-focused output used by dashboard refresh flows.

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `sources.sources_length_limit` | `100` | Ingest normalization before aggregation | Incoming `_store` values are truncated to this max length, which can change source keys returned by this endpoint. |

## Response

### Success Response

```json
{
  "2026": {
    "2": {
      "17": {
        "sources": {
          "com.android.vending": {
            "t": 54,
            "u": 41,
            "n": 12
          },
          "direct": {
            "t": 33,
            "u": 28,
            "n": 7
          }
        }
      }
    }
  },
  "meta": {
    "sources": [
      "com.android.vending",
      "direct"
    ]
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Object | Raw time-object response for sources metric. |
| `{year}.{month}.{day}.sources` | Object | Source metric map for that time bucket. |
| `...sources.{source}.t` | Number | Total sessions/events for source in bucket. |
| `...sources.{source}.u` | Number | Unique users for source in bucket. |
| `...sources.{source}.n` | Number | New users for source in bucket. |
| `meta.sources` | Array | Source keys present in returned dataset. |

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
  "result": "User does not have right"
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
  "result": "User is locked"
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
  "result": "Token is invalid"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Standard read | `action` is not `refresh` | Validates access and returns merged sources time-object for requested period. | Raw root object with time buckets and `meta`. |
| Refresh read | `action=refresh` | Validates access and returns refresh-focused subset for fast UI refresh. | Raw root object with reduced slice and metadata. |

### Source Types Identified

Sources are grouped from the `_store` metric collected during session processing:

| App Type | Input Pattern | Stored Source Behavior |
|---|---|---|
| Mobile | Store/package value (for example `com.android.vending`) | Stored as encoded source key and aggregated directly. |
| Mobile (fallback) | `_store` missing and `_os` present | `_os` is used as source value. |
| Web | Referrer/source URL | URL is normalized before storing source key. |
| Web | Non-URL/non-domain value | Treated as direct/organic-style source label depending on consumer formatting. |

### Referrer Parsing Process (Web)

Before this endpoint reads source metrics, ingest logic normalizes web `_store` values:

1. Removes protocol and leading `www`.
2. Detects known search-engine hosts and keeps only allowed keyword query params.
3. For non-search referrers, removes tracking tags like `_ga`, `_gac`, and `utm_*`.
4. Trims trailing slash in plain host-style values.
5. Applies `sources_length_limit`, then encodes value for storage.

This means response keys are normalized source/referrer identifiers, not always raw incoming referrer strings.

### Impact on Other Data

- Read-only endpoint. No collections are modified.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account, lock state, and feature-level app permissions. |
| `countly.apps` | App validation/context loading | Validates `app_id` and loads app timezone context for period calculations. |
| `countly.sources` | Sources analytics data | Reads per-app source metric documents used to build response buckets. |

---

## Examples

### Read source metrics for last 30 days

```text
/o?
  method=sources&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=30days
```

### Read source metrics in refresh mode

```text
/o?
  method=sources&
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=today&
  action=refresh
```

## Operational Considerations

- Large periods return larger merged time objects and may increase payload size.
- Refresh mode is intended for lightweight dashboard refreshes.

## Related Endpoints

- [Sources - Search Keywords Read](o-sources-keywords.md)
- [Sources - Store Mapping Read](o-sources-stores.md)

## Last Updated

2026-02-17
