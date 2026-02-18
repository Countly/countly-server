---
sidebar_label: "Kafka Events Meta"
---

# System - Kafka Events Meta Read

## Endpoint

```plaintext
/o/system/kafka/events/meta
```

## Overview

Returns distinct filter values for Kafka event logs: event types, consumer groups, topics, and cluster IDs.

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
{
  "eventTypes": ["consume", "commit", "error"],
  "groupIds": ["countly-events", "countly-sessions"],
  "topics": ["events", "sessions"],
  "clusterIds": ["cluster-a"]
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `eventTypes` | Array of String | Distinct non-empty `type` values. |
| `groupIds` | Array of String | Distinct non-empty `groupId` values. |
| `topics` | Array of String | Distinct non-empty `topic` values. |
| `clusterIds` | Array of String | Distinct non-empty `clusterId` values. |

### Error Responses

**Status Code**: `500 Internal Server Error`

```json
{
  "result": "Error fetching Kafka events meta"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Cache hit | Request arrives within 30-second meta cache TTL | Cached meta object. |
| Cache miss | Cache expired or not created yet | Recomputed meta object from distinct queries. |
| Query failure | Distinct query throws | Wrapped error message. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.kafka_consumer_events` | Source for filter value extraction. | Reads distinct values of `type`, `groupId`, `topic`, `clusterId`. |

---

## Examples

### Example 1: Read Kafka events filter metadata

```plaintext
/o/system/kafka/events/meta?api_key=YOUR_API_KEY
```

```json
{
  "eventTypes": ["consume", "error"],
  "groupIds": ["countly-events"],
  "topics": ["events"],
  "clusterIds": ["cluster-a"]
}
```

---

## Operational Considerations

- Metadata responses are cached in memory for 30 seconds.
- Cache is shared per server process; values can differ briefly across multi-node deployments.

## Related Endpoints

- [Kafka Events List](./o-system-kafka-events.md)
- [Kafka Status Read](./o-system-kafka.md)

## Last Updated

2026-02-17
