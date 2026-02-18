---
sidebar_position: 1
sidebar_label: "Overview"
---

# System - API Documentation

## Overview

System endpoints expose operational runtime information for Countly, including version, enabled features, aggregator lag, Kafka consumer/connector status, and observability payloads produced by installed modules.

## Endpoint Index

- [System Version Read](./o-system-version.md) - `/o/system/version`
- [Enabled Features List](./o-system-plugins.md) - `/o/system/plugins`
- [Aggregator Status Read](./o-system-aggregator.md) - `/o/system/aggregator`
- [Kafka Status Read](./o-system-kafka.md) - `/o/system/kafka`
- [Kafka Events List](./o-system-kafka-events.md) - `/o/system/kafka/events`
- [Kafka Events Meta Read](./o-system-kafka-events-meta.md) - `/o/system/kafka/events/meta`
- [Observability Read](./o-system-observability.md) - `/o/system/observability`

## Database Collections

| Collection | Purpose |
|---|---|
| `countly.plugins` | Stores internal change-stream checkpoints used by aggregator status output. |
| `countly.kafka_consumer_state` | Stores Kafka consumer partition processing state. |
| `countly.kafka_consumer_health` | Stores consumer health metrics (rebalance/error/lag). |
| `countly.kafka_lag_history` | Stores historical lag snapshots for time-series charts. |
| `countly.kafka_connect_status` | Stores Kafka Connect connector state snapshots. |
| `countly.kafka_consumer_events` | Stores Kafka consumer event log rows used by event listing and metadata filters. |
| `countly_drill.drill_events` | Provides latest drill change date used in aggregator lag calculations. |

## Configuration & Settings

- `kafka.connectApiUrl` affects whether Kafka Connect status is marked as enabled in `/o/system/kafka`.
- `kafka.connectConsumerGroupId` affects which consumer group lag is reported as sink lag in `/o/system/kafka`.

## Use Cases

- Verify deployment version and enabled feature set.
- Monitor ingestion and aggregation health during incidents.
- Build operational dashboards for Kafka processing performance.
- Inspect available Kafka event filter values for troubleshooting views.

## Last Updated

2026-02-17
