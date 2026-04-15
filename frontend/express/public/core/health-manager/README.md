# Health Manager

Health Manager groups backend health views under one Management entry (`#/manage/health`). Four tabs are registered today: Mutation Status, Aggregator Status, Ingestion Status, and Kafka Events. The tab set is dynamic — additional metrics can be added here via `countlyVue.container.registerTab`.

## Access & Navigation
- Visible to users with the `core` permission.
- Sidebar: Management → Health Manager.
- Routes:
  - `#/manage/health` (redirects to the first tab)
  - `#/manage/health/mutation-status`
  - `#/manage/health/aggregator-status`
  - `#/manage/health/ingestion-status`
  - `#/manage/health/kafka-events`

---

## Mutation Status (UI)
Backed by `GET /o/system/observability` (providers: `mutation`, `clickhouse`). The screen is split into three parts:
1) **System health metrics** - Shows ClickHouse backpressure snapshot and risk. If backpressure pauses the job, a yellow info banner appears: "ClickHouse health check failed, all queued mutation tasks are paused and will resume when the system becomes healthy."
2) **Status summary bar chart** - Groups queued/running/awaiting validation/failed/completed counts. A red banner appears if any record failed: "Some mutation requests hit the maximum retry limit and were not completed, they will not be retried automatically."
3) **Records table** - Lists queued/running/awaiting validation/failed/completed items with DB/collection/query/type/timestamps/error/retry info. Completed records older than 30 days are auto-removed by the TTL index on `mutation_manager`.

ClickHouse optionality: when ClickHouse is not enabled, the system health section and `awaiting_ch_mutation_validation` status are hidden because they are ClickHouse-specific and do not block the Mongo-only flow.

## Mutation Status (Backend)
The Mutation Manager service ensures granular deletes/updates reach all datastores that hold raw analytics. A single worker runs every minute (schedule is configurable in the `jobs` page) and reserves up to 10 oldest queued items per batch (batch limit is configurable in the `plugins` collection), marks them `running`, applies Mongo delete/update, optionally schedules ClickHouse mutations, then retries or completes. If ClickHouse pressure is high, reservation pauses and the yellow banner stays up until healthy.
For more key points: `core/api/utils/mutationManager.README.md`
- Accepts intents via `/core/delete_granular_data` and `/core/update_granular_data`; queues them in the `mutation_manager` collection with retry/backoff.
- A third hook, `/core/execute_native_ch_mutation`, accepts raw ClickHouse ALTER TABLE DELETE/UPDATE statements. The SQL is validated by `isSafeNativeChMutation()` which only allows ALTER TABLE … DELETE/UPDATE … WHERE … syntax.
- Runs a single-concurrency job (`core/api/jobs/mutationManagerJob.js`) every minute to reserve batches, process Mongo updates/deletes, and, when ClickHouse is enabled, schedule matching mutations.
- Status lifecycle: `queued` → `running` → (optional) `awaiting_ch_mutation_validation` → `completed` or `failed` (after max retries).
- Job defaults: `STALE_MS` 24 h, `RETRY_DELAY_MS` 30 min, `MAX_RETRIES` 3, `VALIDATION_INTERVAL_MS` 3 min, `BATCH_LIMIT` 10.
- Fields: `ts`, `hb`, `retry_at`, `error`, `mutation_completion_ts` (used by the TTL index to purge old completed items).
- Observability: registers `/system/observability/collect` with provider `mutation`, exposing queue summary and ClickHouse pressure so the UI and probes can react.

---

## Aggregator Status (UI)
Backed by `GET /o/system/kafka` and `GET /o/system/aggregator`. The screen displays:

### Kafka Consumer Stats
When Kafka is enabled, displays comprehensive consumer health metrics. Consumer groups whose ID contains `connect-clickhouse-sink` are filtered **out** — those are shown in the Ingestion Status tab instead.

1. **Summary Cards** - Six metric cards showing:
   - Total Lag: Messages waiting to be processed (color-coded: green <1k, yellow <10k, red >10k)
   - Batches Processed: Total batches since last TTL cleanup (7 days)
   - Duplicates Skipped: Batches deduplicated during rebalances
   - Avg Batch Size: Average events per batch
   - Rebalances: Consumer group rebalances (should be low)
   - Errors: Recorded errors (color-coded by severity)

2. **Consumer Groups Table** - Per-consumer-group stats:
   - Group ID, Total Lag, Rebalance Count, Last Rebalance
   - Commit Count, Last Commit, Error Count, Last Error
   - Lag Updated timestamp

3. **Partition Stats Table** - Per-partition deduplication and batch stats:
   - Consumer Group, Topic, Partition, Last Committed Offset
   - Batch Count, Duplicates Skipped, Avg/Last Batch Size
   - Last Processed timestamp

### Change Stream Aggregator Status
For non-Kafka deployments, shows change stream resume token status:
- Name, Acknowledged timestamp, Drill timestamp
- Diff(drill): Lag behind drill events
- Diff(now): Lag behind current time

---

## Ingestion Status (UI)
Backed by `GET /o/system/kafka` (same endpoint as Aggregator Status, but filtered to only show consumer groups whose ID contains `connect-clickhouse-sink`). The screen monitors the Kafka Connect ClickHouse sink pipeline:

1. **Summary Cards** - Four metric cards:
   - Sink Lag: Total lag for sink consumer groups (color-coded: green <1k, yellow <10k, red >10k)
   - Connectors Running: Running / total connectors
   - Tasks Running: Running / total tasks across all connectors
   - Throughput: Events-per-second from lag history

2. **Throughput Chart** - Line chart of historical throughput derived from `kafka_lag_history` snapshots.

3. **Connector Details Table** - Per-connector status from `kafka_connect_status`:
   - Connector Name, State (RUNNING / PAUSED / FAILED), Type, Worker ID
   - Tasks: each task's state, worker, and trace (if failed)

## Ingestion Status (Backend)
- The `kafkaLagMonitor.js` job (runs every 2 minutes) also fetches Kafka Connect connector status via the Connect REST API (`connectApiUrl` config) and writes to the `kafka_connect_status` collection.
- Connector status documents include: connector name, state, type, worker ID, tasks array with per-task state/worker/trace.
- The same `/o/system/kafka` endpoint serves both Aggregator and Ingestion tabs; the frontend applies the `connect-clickhouse-sink` filter.

---

## Kafka Events (UI)
Backed by `GET /o/system/kafka/events` and `GET /o/system/kafka/events/meta`. The screen shows a server-side paginated table of consumer anomaly events recorded during batch deduplication:

1. **Filters** - Filter by event type and consumer group (populated from the `/meta` endpoint).

2. **Events Table** - Columns: Timestamp, Type, Severity, Group ID, Topic, Partition, Cluster ID, State Key. Each row is expandable to show full event details and metadata (hostname, process ID).

3. **Event Types and Severity**:

   | Type | Severity | Color | Meaning |
   |------|----------|-------|---------|
   | `CLUSTER_MISMATCH` | error | red | Stored cluster ID ≠ current cluster ID. Consumer state is reset. |
   | `OFFSET_BACKWARD` | error | red | Committed offset went backward significantly. Partition state is reset. |
   | `STATE_RESET` | warning | yellow | Full state reset triggered during a cluster mismatch. |
   | `STATE_MIGRATED` | success | green | Legacy state document upgraded to cluster-versioned format. |

4. **Pagination** - Server-side pagination via the `ServerDataTable` pattern; the API supports `page`, `limit`, `sort`, `query` (type/groupId filters).

## Kafka Events (Backend)
- Events are recorded by `KafkaEventSource.js` during batch deduplication when anomalies are detected (cluster mismatch, offset regression, state migration).
- Each event document includes: `ts`, `type`, `groupId`, `topic`, `partition`, `clusterId`, `stateKey`, `details` (human-readable message), `metadata` (hostname, processId).
- The `/o/system/kafka/events/meta` endpoint returns distinct event types and group IDs for filter dropdowns; the response is cached for 30 seconds with in-flight deduplication to prevent thundering-herd on page load.
- Query index: `{ type: 1, groupId: 1, ts: -1 }` (created in `aggregator.ts`).

---

## Backend Collections

| Collection | Purpose | TTL | Created In |
|------------|---------|-----|------------|
| `mutation_manager` | Granular mutation request queue | 30 days on `mutation_completion_ts` | `mutationManager.ts` |
| `kafka_consumer_state` | Per-partition dedup and batch size stats | 7 days | `aggregator.ts` |
| `kafka_consumer_health` | Per-group health (lag, rebalances, errors) | 7 days | `aggregator.ts` |
| `kafka_lag_history` | Lag snapshots for throughput charts | Capped: 1000 docs / 5 MB | `aggregator.ts` |
| `kafka_connect_status` | Kafka Connect connector status | 7 days on `updatedAt` | `ingestor.js` |
| `kafka_consumer_events` | Consumer anomaly events | 30 days on `ts` | `aggregator.ts` |

## Lag Monitoring Job
The `kafkaLagMonitor.js` job runs every 2 minutes to:
1. Connect to Kafka admin API and fetch high watermarks for all topics
2. Compare with committed offsets to calculate per-partition lag
3. Update `kafka_consumer_health` collection with lag stats
4. Fetch Kafka Connect connector/task status via the Connect REST API
5. Write connector status to `kafka_connect_status`
6. Append lag snapshots to `kafka_lag_history` (capped collection)
