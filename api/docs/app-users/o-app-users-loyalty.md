---
sidebar_label: "Read Loyalty"
---

# /o/app_users/loyalty

## Endpoint

```plaintext
/o/app_users/loyalty
```

## Overview

Return loyalty distribution buckets for all-time, last 7 days, and last 30 days.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires read-level app access.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API authentication key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |
| `app_id` | String | Yes | Target app ID. |
| `query` | JSON String (Object) | No | Optional filter query applied before loyalty bucket aggregation. |

## Response

### Success Response

```json
{
  "all": [
    {"_id":"1","count":120,"index":0},
    {"_id":"2","count":43,"index":1},
    {"_id":"3-5","count":98,"index":2}
  ],
  "7days": [
    {"_id":"1","count":21,"index":0}
  ],
  "30days": [
    {"_id":"1","count":50,"index":0}
  ]
}
```

Aggregation-fallback shape (still HTTP `200`):

```json
{}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `all` | Array of Objects | Loyalty distribution across all matched users. |
| `7days` | Array of Objects | Loyalty distribution for users active in last 7 days. |
| `30days` | Array of Objects | Loyalty distribution for users active in last 30 days. |
| `bucket._id` | String | Bucket label (`1`, `2`, `3-5`, `6-9`, `10-19`, `20-49`, `50-99`, `100-499`, `500+`). |
| `bucket.count` | Number | User count in bucket. |
| `bucket.index` | Number | Stable sort index for bucket ordering. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"app_id\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Query parsed | `query` is valid JSON (or omitted) | Applies preprocessors and aggregates loyalty ranges for all, 7-day, and 30-day windows. | Raw object: `{ "all": [...], "7days": [...], "30days": [...] }` |
| Query parse fallback | `query` JSON parsing fails | Falls back to empty query `{}` and runs aggregation on full app-user scope. | Raw object: `{ "all": [...], "7days": [...], "30days": [...] }` |
| Aggregation error | Any aggregation promise fails | Returns empty raw object. | Raw object: `{}` |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication and permission validation | Reads member identity and app-level read permissions. |
| `countly.app_users{appId}` | Loyalty aggregation source | Reads `sc` (session count), `ls` (last seen), and filter-matched user fields to build loyalty buckets. |

---
## Examples

### Example 1: Loyalty distribution

```plaintext
/o/app_users/loyalty?api_key=YOUR_API_KEY&app_id=64b0ac10c2c3ce0012dd1001
```

```json
{
  "all": [
    {"_id":"1","count":120,"index":0}
  ],
  "7days": [],
  "30days": []
}
```

## Limitations

- Query parse failures silently fall back to `{}` filter.

---
## Related Endpoints

- [App Users - Export](i-app-users-export.md)
- [App Users - Download Export](o-app-users-download.md)

## Last Updated

2026-02-17