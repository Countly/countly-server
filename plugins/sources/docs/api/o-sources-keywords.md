---
sidebar_label: "Search Keywords Read"
---

# Sources - Search Keywords Read

## Endpoint

```text
/o/keywords
```

## Overview

Returns keyword metrics derived from stored source/referrer entries by extracting recognized search-query values.

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
| `api_key` | String | Conditional | Required if `auth_token` is not provided. |
| `auth_token` | String | Conditional | Required if `api_key` is not provided. |
| `app_id` | String | Conditional | Required for non-global-admin users during read validation. |
| `period` | String | No | Standard Countly period value used for source metric extraction. |

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

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `sources.sources_length_limit` | `100` | Ingest normalization before this read | Long incoming source/referrer strings are truncated before storage, which can affect what keyword-bearing source entries remain parseable. |

## Response

### Success Response

```json
[
  {
    "_id": "countly analytics",
    "t": 37,
    "n": 21,
    "u": 34
  },
  {
    "_id": "mobile analytics sdk",
    "t": 22,
    "n": 11,
    "u": 20
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `[]` | Array | Keyword metric entries extracted from source records. |
| `[]["_id"]` | String | Decoded keyword value extracted from supported search query parameters. |
| `[].t` | Number | Total count for keyword. |
| `[].n` | Number | New-user count for keyword. |
| `[].u` | Number | Unique-user count for keyword. |

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
| Keyword match | Source `_id` parses to URL containing recognized keyword param/domain pair | Extracts query value, re-encodes it as keyword key, and includes metric entry in output. | Raw array of keyword metric objects. |
| No keyword match | Source `_id` cannot be parsed to supported keyword pattern | Entry is skipped and not included in output. | Raw array (possibly empty). |

### Keyword Extraction Process

Keyword output is produced from stored source keys using this flow:

1. Decode stored source key.
2. Parse it as URL/referrer data.
3. Match query parameter names against supported keyword keys (for example `q`-style parameters).
4. For domain-scoped rules, verify the parsed host matches the expected search-engine domain rule.
5. Replace entry `_id` with extracted keyword value and include metric totals.

Only entries that pass parsing and keyword-rule checks are returned.

### Impact on Other Data

- Read-only endpoint. No collections are modified.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission checks | Reads member account, lock state, and feature-level app permissions. |
| `countly.apps` | App validation/context loading | Validates `app_id` and loads app timezone context for period calculations. |
| `countly.sources` | Source metric input | Reads source metric entries used for keyword extraction. |

---

## Examples

### Read search keyword metrics for last 30 days

```text
/o/keywords?
  api_key=YOUR_API_KEY&
  app_id=6991c75b024cb89cdc04efd2&
  period=30days
```

## Limitations

- Only sources that parse as URLs with supported search query parameters are returned.
- Returned keyword strings depend on available source records for the selected period.

## Related Endpoints

- [Sources - Traffic Sources Read](o-sources-fetch.md)
- [Sources - Store Mapping Read](o-sources-stores.md)

## Last Updated

2026-02-17
