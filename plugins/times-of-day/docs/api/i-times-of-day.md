---
sidebar_label: "Times Of Day Ingestion"
---

# Times Of Day - Ingestion

## Endpoint

```plaintext
/i
```

## Overview

Ingestion-time update path for Times Of Day data. It records session/event counts by day-of-week and hour.

## Authentication

Uses standard `/i` SDK ingestion authentication (`app_key` + device context).

## Permissions

Standard write ingestion flow; request access is controlled by ingestion authentication and app key validity.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `app_key` | String | Yes | App key used by ingestion API. |
| `begin_session` | Number | Conditional | Session flag. Required for session writes. |
| `events` | String (JSON Array) or Array | Conditional | Event list. Required for event writes. |
| `hour` | Number | Conditional | Hour `0..23` for session or fallback for events. |
| `dow` | Number | Conditional | Day-of-week `0..6` for session or fallback for events. |
| `timestamp` | Number | No | Timestamp used to derive monthly bucket id. |

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `api.batch_processing` | Server config | Write path | Enables write-batcher mode instead of direct bulk writes. |
| `api.event_limit` | Server config | Event filtering | When app has too many events, only listed events are written. |

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
| `result` | String | Standard `/i` ingestion success output. |

### Error Responses

This handler itself does not return custom errors; `/i` pipeline validation errors apply.

## Behavior/Processing

- Session writes use metric key `[CLY]_session`.
- Event writes use each event `key` and `count`; event-level `hour`/`dow` override request-level values.
- Stores data in monthly docs and increments `d.{dow}.{hour}.count`.

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.times_of_day` | Times of day storage | Upserts monthly docs and increments day/hour counters. |
| `countly.events` | Event allow-list source | Reads app event list for `event_limit` filtering logic. |

---

## Examples

### Session ingestion sample

```plaintext
/i?app_key=YOUR_APP_KEY&device_id=device-123&begin_session=1&hour=13&dow=2&timestamp=1741286400
```

### Event ingestion sample

```plaintext
/i?app_key=YOUR_APP_KEY&device_id=device-123&events=[{"key":"purchase","count":2,"hour":13,"dow":2}]
```

## Related Endpoints

- [Times Of Day - Query](o-times-of-day.md)

## Last Updated

2026-03-05
