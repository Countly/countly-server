---
sidebar_label: "Entries Read"
---

# /o/cms/entries

## Endpoint

```plaintext
/o/cms/entries
```

## Overview

Read CMS cache entries for a supported API ID.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires authenticated dashboard user access.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `_id` | String | Yes | CMS API ID. Allowed values: `server-guides`, `server-consents`, `server-intro-video`, `server-quick-start`, `server-guide-config`. |
| `query` | JSON String (Object) | No | Optional filter object merged into cache lookup logic. Invalid JSON is ignored. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `config.enableGuides` | Server config value | Response data enrichment | For `_id=server-guide-config`, response `data[0].enableGuides` falls back to this config value when missing/falsy in cached data. |

## Response

### Success Response

```json
{
  "data": [
    {
      "_id": "server-guides_1",
      "title": "Getting Started",
      "body": "Welcome",
      "lu": 1771232910
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `data` | Array | Matching CMS cache entries for the requested API ID. |
| `data[]._id` | String | Cache entry ID. |
| `data[].lu` | Number | Last-updated timestamp (milliseconds since epoch). |
| `data[].*` | Any JSON type | Entry payload fields saved in cache. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing or incorrect API _id parameter"
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"api_key\" or \"auth_token\""
}
```

**Status Code**: `500 Internal Server Error`
```json
{
  "result": "An error occured while fetching CMS entries from DB: Database query failed"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Standard read | Valid `_id` with or without `query` | Loads matching entries from `cms_cache`, removes `_meta` entry from output, returns `data` array. | Raw object: `{ "data": [...] }` |
| Query parse fallback | Invalid `query` JSON | Ignores query filter and performs standard `_id`-prefix lookup only. | Raw object: `{ "data": [...] }` |
| Guide-config enrichment | `_id=server-guide-config` and at least one data row | Applies `enableGuides` fallback from server config when response field is missing/falsy. | Raw object: `{ "data": [...] }` |

### Impact on Other Data

- This endpoint is read-only and does not modify stored data.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication validation | Reads member identity for access validation. |
| `countly.cms_cache` | CMS cache source | Reads cached entries by `_id` prefix (and optional query conditions). |

---
## Examples

### Example 1: Read guides entries

```plaintext
/o/cms/entries?api_key=YOUR_API_KEY&_id=server-guides
```

### Example 2: Read guide-config with filter

```plaintext
/o/cms/entries?api_key=YOUR_API_KEY&_id=server-guide-config&query={"platform":"server"}
```

## Limitations

- `_id` must be one of the supported API IDs.
- Invalid `query` JSON does not return a parse error; it is ignored.

---
## Related Endpoints

- [CMS - Entries Save](i-cms-save-entries.md)
- [CMS - Cache Clear](i-cms-clear.md)

## Last Updated

2026-02-17
