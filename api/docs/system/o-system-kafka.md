---
sidebar_label: "Kafka Status"
---

# System - Kafka Status Read

## Endpoint

```plaintext
/o/system/kafka
```

## Overview

Returns Kafka processing status summary, partition/consumer metrics, lag history, and Kafka Connect status.

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

## Configuration Impact

| Setting | Default | Affects | User-visible impact |
|---|---|---|---|
| `kafka.connectApiUrl` | Not set | `connectStatus.enabled` | When configured, Kafka Connect section is marked enabled. |
| `kafka.connectConsumerGroupId` | Not set | `connectStatus.sinkLag`, `connectStatus.sinkLagUpdatedAt` | Selects which consumer group contributes sink lag metrics. |

## Response

### Success Response

```json
{
  "summary": {
    "totalBatchesProcessed": 251220,
    "totalDuplicatesSkipped": 312,
    "avgBatchSizeOverall": 184.32,
    "totalRebalances": 12,
    "totalErrors": 3,
    "totalLag": 45,
    "consumerGroupCount": 2,
    "partitionCount": 4
  },
  "partitions": [
    {
      "id": "67b2f83425b77f6104dace1d",
      "consumerGroup": "countly-events",
      "topic": "events",
      "partitionCount": 8,
      "activePartitions": 8,
      "lastProcessedAt": "2026-02-17T11:21:00.000Z",
      "batchCount": 251220,
      "duplicatesSkipped": 312,
      "lastDuplicateAt": "2026-02-17T10:55:10.000Z",
      "lastBatchSize": 220,
      "avgBatchSize": 184
    }
  ],
  "consumers": [
    {
      "id": "67b2f8ae25b77f6104dace2a",
      "groupId": "countly-events",
      "rebalanceCount": 7,
      "lastRebalanceAt": "2026-02-16T18:00:00.000Z",
      "commitCount": 10420,
      "errorCount": 1,
      "totalLag": 12,
      "partitionLag": {
        "events-0": 2
      },
      "updatedAt": "2026-02-17T11:21:00.000Z"
    }
  ],
  "lagHistory": [
    {
      "ts": "2026-02-17T11:00:00.000Z",
      "groups": {
        "countly-events": 12
      },
      "connectLag": 9
    }
  ],
  "connectStatus": {
    "enabled": true,
    "connectors": [
      {
        "id": "67b2f91d25b77f6104dace4b",
        "connectorName": "countly-clickhouse-sink",
        "connectorState": "RUNNING",
        "connectorType": "sink",
        "workerId": "connect-1",
        "tasks": [],
        "tasksRunning": 0,
        "tasksTotal": 0,
        "updatedAt": "2026-02-17T11:21:00.000Z"
      }
    ],
    "sinkLag": 9,
    "sinkLagUpdatedAt": "2026-02-17T11:21:00.000Z"
  }
}
```

### Response Fields

| Field | Type | Description |
|---|---|---|
| `summary` | Object | Aggregated totals derived from state and health collections. |
| `partitions` | Array | Per `consumerGroup + topic` partition processing status. |
| `consumers` | Array | Per consumer group health metrics and lag. |
| `lagHistory` | Array | Historical lag samples, returned oldest-to-newest for charting. |
| `connectStatus.enabled` | Boolean | `true` when Kafka Connect API URL is configured. |
| `connectStatus.connectors` | Array | Connector status list from `kafka_connect_status`. |
| `connectStatus.sinkLag` | Number | Lag for configured sink consumer group, if configured and found. |

### Error Responses

**Status Code**: `500 Internal Server Error`

```json
{
  "result": "Error fetching Kafka stats"
}
```

## Behavior/Processing

### Behavior Modes

| Mode | Trigger | Response Shape |
|---|---|---|
| Full Kafka status | Query succeeds | Object with `summary`, `partitions`, `consumers`, `lagHistory`, `connectStatus`. |
| Query failure | Any source query/aggregation throws | Wrapped error message. |

## Database Collections

| Collection | Used for | Data touched by this endpoint |
|---|---|---|
| `countly.kafka_consumer_state` | Source for partition-level processing metrics. | Reads rows and summary aggregation input. |
| `countly.kafka_consumer_health` | Source for consumer-group health and lag metrics. | Reads rows and summary aggregation input. |
| `countly.kafka_lag_history` | Source for lag history chart data. | Reads recent history records. |
| `countly.kafka_connect_status` | Source for connector state snapshots. | Reads connector status rows. |

---

## Examples

### Example 1: Read Kafka status overview

```plaintext
/o/system/kafka?api_key=YOUR_API_KEY
```

```json
{
  "summary": {
    "totalLag": 45,
    "consumerGroupCount": 2
  },
  "connectStatus": {
    "enabled": true,
    "sinkLag": 9
  }
}
```

---

## Operational Considerations

- Endpoint fetches and aggregates multiple collections; it is heavier than simple metadata endpoints.
- Each of `partitions`, `consumers`, and `connectStatus.connectors` is capped to recent rows (query limit: 500).

## Limitations

- Values depend on background Kafka monitoring jobs populating the source collections.
- If monitoring collections are empty, arrays are returned empty with zeroed summary values.

## Related Endpoints

- [Kafka Events List](./o-system-kafka-events.md)
- [Kafka Events Meta Read](./o-system-kafka-events-meta.md)
- [Aggregator Status Read](./o-system-aggregator.md)

## Last Updated

2026-02-17
