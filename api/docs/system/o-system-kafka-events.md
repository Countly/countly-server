---
sidebar_label: "Kafka Events List"
---

# System - Kafka Events List

## Endpoint

```plaintext
/o/system/kafka/events
```

## Overview

Returns paginated Kafka consumer event log rows with optional filtering and sorting.

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
| `eventType` | String | No | Filter by event type. Use `all` or omit for no filter. |
| `groupId` | String | No | Filter by consumer group. Use `all` or omit for no filter. |
| `topic` | String | No | Filter by topic. Use `all` or omit for no filter. |
| `clusterId` | String | No | Filter by cluster id. Use `all` or omit for no filter. |
| `iSortCol_0` | Number | No | Sort column index: `0` `_id`, `1` `ts`, `2` `type`, `3` `groupId`, `4` `topic`, `5` `partition`, `6` `clusterId`. |
| `sSortDir_0` | String | No | Sort direction: `asc` or `desc`. |
| `iDisplayStart` | Number | No | Pagination offset, defaults to `0` when invalid. |
| `iDisplayLength` | Number | No | Page size. Allowed range: `1..1000`. Invalid values default to `50`. |
| `sEcho` | String | No | Echo token returned unchanged in response. |

## Response

### Success Response

```json
{
  "sEcho": "1",
  "iTotalRecords": 502,
  "iTotalDisplayRecords": 31,
  "aaData": [
    {
      "_id": "67b2f76f9bb0d5f2f4a13e1a",
      "ts": 1739790000000,
      "type": "consume",
      "groupId": "countly-events",
      "topic": "events",
      "partition": 2,
      "clusterId": "cluster-a"
    }
  ]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `sEcho` | String | Echo value from request (if provided). |
| `iTotalRecords` | Number | Total records in `kafka_consumer_events` without filters. |
| `iTotalDisplayRecords` | Number | Total records matching active filters. |
| `aaData` | Array | Paginated event rows after filtering/sorting. |
| `aaData[].type` | String | Event type (`consume`, `error`, etc.). |
| `aaData[].groupId` | String | Consumer group id. |
| `aaData[].topic` | String | Topic name. |
| `aaData[].partition` | Number | Kafka partition number. |
| `aaData[].clusterId` | String | Kafka cluster id. |

### Error Responses

**Status Code**: `500 Internal Server Error`

```json
{
  "result": "Error fetching Kafka consumer events"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Filtered page | Any filter params provided (`eventType`, `groupId`, `topic`, `clusterId`) | Paginated table response with filtered totals. |
| Unfiltered page | No filters or filters set to `all` | Paginated table response with global totals. |
| Query failure | Mongo query fails | Wrapped error message. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.kafka_consumer_events` | Source for event log rows and counts. | Reads counts and paginated records. |

---

## Examples

### Example 1: First page, default sort

```plaintext
/o/system/kafka/events?api_key=YOUR_API_KEY&iDisplayStart=0&iDisplayLength=50&sEcho=1
```

### Example 2: Filter by group and topic

```plaintext
/o/system/kafka/events?api_key=YOUR_API_KEY&groupId=countly-events&topic=events&iDisplayStart=0&iDisplayLength=25&sEcho=2
```

```json
{
  "sEcho": "2",
  "iTotalRecords": 502,
  "iTotalDisplayRecords": 12,
  "aaData": [
    {
      "type": "consume",
      "groupId": "countly-events",
      "topic": "events"
    }
  ]
}
```

---

## Operational Considerations

- Requesting `iDisplayLength` above `1000` is clamped to default `50`.
- Invalid sort column indexes fall back to sort by `ts` descending.

## Related Endpoints

- [Kafka Events Meta Read](./o-system-kafka-events-meta.md)
- [Kafka Status Read](./o-system-kafka.md)

## Last Updated

2026-02-17
