---
sidebar_label: "Record Feedback"
---

# Star Rating - Record Feedback

## Endpoint

```plaintext
/i/feedback/input
```

## Overview

Ingests one `[CLY]_star_rating` event through Countly write pipeline.

## Authentication

Uses SDK ingestion authentication in the proxied `/i` request (`app_key`, `device_id`, and write parameters).

## Permissions

Request access is validated by the underlying `/i` ingestion path.

## Request Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `events` | String (JSON Array) | Yes | Must contain exactly one event with key `[CLY]_star_rating`. |
| `app_key` | String | Yes | App key for ingestion validation (passed to proxied `/i`). |
| `device_id` | String | Yes | Device ID for ingestion validation (passed to proxied `/i`). |
| `timestamp` | Number | No | Optional event timestamp passed to ingestion. |
| `hour` | Number | No | Optional event hour passed to ingestion. |
| `dow` | Number | No | Optional event day-of-week passed to ingestion. |

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
| `result` | String | Ingestion pipeline result for proxied write request. |

### Error Responses

- `400`

```json
{
  "result": "invalid_event_request"
}
```

- non-200 responses from proxied `/i` request are forwarded using returned `result` payload.

## Behavior/Processing

- Parses `events` JSON.
- Rejects when payload is not exactly one event or event key is not `[CLY]_star_rating`.
- Proxies to `/i?...` with `no_checksum=true` via `requestProcessor.processRequest`.
- Forwards proxied response body/status back to client.

## Database Collections

This handler does not directly read/write collections; writes occur in underlying ingestion pipeline collections (events/drill paths) after proxying.

## Examples

### Ingest one star-rating event

```plaintext
/i/feedback/input?
  app_key=YOUR_APP_KEY&
  device_id=device_123&
  events=[{"key":"[CLY]_star_rating","count":1,"segmentation":{"rating":5,"widget_id":"67a3d2f5c1a23b0f4d6c0201","comment":"Great app"}}]
```

## Related Endpoints

- [Star Rating - Get Feedback Data](o-feedback-data.md)

## Last Updated

2026-03-07
