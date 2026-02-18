---
sidebar_label: "Export Data"
---

# /o/export/data

## Endpoint

```plaintext
/o/export/data
```

## Overview

Converts a provided payload into an export file without querying a collection.

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
| `data` | JSON String (Array/Object) or Array/Object | Yes | Data payload to convert and export. |
| `raw` | Boolean | No | When truthy, skips JSON parsing of string `data`. |
| `type` | String | No | Export format (`json`, `csv`, `xls`, `xlsx`). |
| `filename` | String | No | Download file name prefix. |

## Parameter Semantics

- If `data` is a string and `raw` is not set, it must be valid JSON.
- Object payloads are converted to array form internally for export conversion.

## Response

### Success Response

CSV export example (file content):

```csv
event,count,sum
Purchase,19,233.74
Subscription,8,159.92
```

JSON export example (file content):

```json
[
  {
    "event": "Purchase",
    "count": 19,
    "sum": 233.74
  },
  {
    "event": "Subscription",
    "count": 8,
    "sum": 159.92
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(download body)` | String or Binary | Exported file content created from provided `data`. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"data\""
}
```

**Status Code**: `400 Bad Request`
```json
{
  "result": "Incorrect parameter \"data\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Parsed-data mode | `data` is a string and `raw` is not set | Parses JSON payload, normalizes to exportable array/object form, converts to requested output format. | Download stream/body (format depends on `type`) |
| Raw-data mode | `raw` is set | Skips JSON parsing and exports provided `data` value directly. | Download stream/body (format depends on `type`) |

### Impact on Other Data

- No collection writes. This endpoint only formats and returns output.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication validation | Reads caller identity for management-read access validation. |

---

## Examples

### Example 1: Export provided array as CSV

```plaintext
/o/export/data?
  api_key=YOUR_API_KEY&
  data=[{"event":"Purchase","count":19,"sum":233.74},{"event":"Subscription","count":8,"sum":159.92}]&
  type=csv&
  filename=event-summary
```

### Example 2: Export provided payload as JSON

```plaintext
/o/export/data?
  api_key=YOUR_API_KEY&
  data={"rows":[{"country":"US","users":124},{"country":"ES","users":48}]}&
  type=json&
  filename=country-users
```

## Operational Considerations

- Large payloads increase conversion memory/time.
- For very large exports, prefer asynchronous request-query export.

---

## Related Endpoints

- [Data Export - Export Request](./o-export-request.md)
- [Data Export - Export Request Query](./o-export-requestquery.md)

## Last Updated

2026-02-17
