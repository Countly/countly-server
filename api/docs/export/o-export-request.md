---
sidebar_label: "Export Request"
---

# /o/export/request

## Endpoint

```plaintext
/o/export/request
```

## Overview

Calls another API path, transforms the returned payload, and returns it as a downloadable export file.

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
| `path` | String | Yes | Target API path to call (for example `/o/analytics/dashboard`). |
| `method` | String | No | Optional request method value passed into export pipeline. |
| `data` | JSON String (Object) | No | Request payload passed to the target path. |
| `prop` | String | No | Dot path to extract a nested property from target response before export. |
| `projection` | JSON String (Object) | No | Include-only projection applied to returned objects. |
| `columnNames` | JSON String (Object) | No | Field rename map for output columns. |
| `mapper` | JSON String (Object) | No | Value transformation map for exported fields. |
| `type` | String | No | Export format (`json`, `csv`, `xls`, `xlsx`). |
| `filename` | String | No | Download file name prefix. |

## Parameter Semantics

- `path` is normalized to start with `/`.
- If `data` parsing fails, an empty object is used.
- If `projection`, `columnNames`, or `mapper` parsing fails, empty/default processing is used.
- `prop` is applied after target response is received.

## Response

### Success Response

CSV export example (file content):

```csv
country,total_sessions,new_users
United States,121,11
Spain,87,6
```

JSON export example (file content):

```json
[
  {
    "country": "United States",
    "total_sessions": 121,
    "new_users": 11
  },
  {
    "country": "Spain",
    "total_sessions": 87,
    "new_users": 6
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(download body)` | String or Binary | Exported file content produced from internal request response. |

### Error Responses

**Status Code**: `400 Bad Request`
```json
{
  "result": "Missing parameter \"path\""
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Processing Path | Response Shape |
|---|---|---|---|
| Direct export mode | `path` is provided without mapping transforms | Calls target API path and converts returned payload to requested format. | Download stream/body (format depends on `type`) |
| Field-mapped export mode | `projection`, `columnNames`, or `mapper` is provided | Applies field filtering/renaming/value transforms before export conversion. | Download stream/body (format depends on `type`) |
| Property extraction mode | `prop` is provided | Extracts nested property from target response before export conversion. | Download stream/body (format depends on `type`) |

### Impact on Other Data

- Read-only for this endpoint flow. It does not write export task records.

## Audit & System Logs

- No `/systemlogs` action is emitted by this endpoint itself.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.members` | Authentication validation | Reads caller identity for management-read access validation. |
| Depends on `path` | Target request data source | Reads whatever the referenced target API path reads. |

---

## Examples

### Example 1: Export dashboard countries using nested property extraction

```plaintext
/o/export/request?
  api_key=YOUR_API_KEY&
  path=/o/analytics/countries&
  data={"app_id":"6991c75b024cb89cdc04efd2"}&
  prop=30days&
  type=csv&
  filename=countries-30days
```

### Example 2: Export with custom column names

```plaintext
/o/export/request?
  api_key=YOUR_API_KEY&
  path=/o/analytics/tops&
  data={"app_id":"6991c75b024cb89cdc04efd2","period":"30days"}&
  prop=platforms&
  columnNames={"name":"Platform","value":"Sessions","percent":"Share"}&
  type=xlsx&
  filename=top-platforms
```

## Operational Considerations

- Result shape depends on the referenced `path` and `prop`.
- Very large returned payloads can increase response memory and conversion time.

## Limitations

- Invalid `path` behavior is inherited from the target endpoint and may return empty export output.
- This endpoint does not create asynchronous task records by itself.

---

## Related Endpoints

- [Data Export - Export Database](./o-export-db.md)
- [Data Export - Export Request Query](./o-export-requestquery.md)
- [Data Export - Export Data](./o-export-data.md)

## Last Updated

2026-02-17
