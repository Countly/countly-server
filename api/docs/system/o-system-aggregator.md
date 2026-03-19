---
sidebar_label: "Aggregator Status"
---

# System - Aggregator Status Read

## Endpoint

```plaintext
/o/system/aggregator
```

## Overview

Returns per-aggregator lag status by comparing aggregator checkpoints with current time and latest drill data timestamp.

## Authentication

- API Key (parameter): `api_key=YOUR_API_KEY`
- Auth Token (parameter): `auth_token=YOUR_AUTH_TOKEN`
- Auth Token (header): `countly-token: YOUR_AUTH_TOKEN`

## Permissions

- Requires authenticated dashboard user access to management-read endpoints.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `api_key` | String | Yes (or use `auth_token`) | Dashboard API key. |
| `auth_token` | String | Yes (or use `api_key`) | Dashboard auth token. |

## Response

### Success Response

```json
[
  {
    "name": "events",
    "last_cd": "2026-02-17T11:20:00.000Z",
    "drill": "2026-02-17T11:20:02.000Z",
    "last_id": "67b2f7ba7acdc44f5079c100",
    "diff": 3,
    "diffDrill": 1
  }
]
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `(root)` | Array | One item per aggregator stream key in `countly.plugins._changeStreams`. |
| `name` | String | Aggregator stream name. |
| `last_cd` | String | Last accepted change date of this stream. |
| `drill` | String | Latest drill event `cd` value used for drill lag comparison. |
| `last_id` | String | Last processed change stream object id for this stream. |
| `diff` | Number | Seconds from `last_cd` to current server time. |
| `diffDrill` | Number | Seconds from `last_cd` to latest drill `cd` value. |

### Error Responses

**Status Code**: `400 Bad Request`

```json
{
  "result": "Error fetching aggregator status"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Aggregator rows available | `_changeStreams` document has stream keys | Array with lag objects. |
| No stream rows | `_changeStreams` missing or only `_id` | Empty array. |
| Query failure | Mongo/drill query throws | Wrapped error message. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.plugins` | Source of `_changeStreams` checkpoint document. | Reads checkpoint rows for each stream key. |
| `countly_drill.drill_events` | Source of latest drill `cd` timestamp. | Reads most recent drill change date (`cd`). |

---

## Examples

### Example 1: Read aggregator lag status

```plaintext
/o/system/aggregator?api_key=YOUR_API_KEY
```

```json
[
  {
    "name": "events",
    "diff": 6,
    "diffDrill": 3
  }
]
```

---

## Operational Considerations

- High `diff` values indicate aggregator lag relative to current time.
- High `diffDrill` values indicate lag versus current drill ingestion state.

## Related Endpoints

- [Kafka Status Read](./o-system-kafka.md)
- [Observability Read](./o-system-observability.md)

## Last Updated

2026-02-17
