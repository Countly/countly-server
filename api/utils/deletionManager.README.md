# Deletion Manager

Deletion Manager is the service layer that guarantees granular deletion requests reach every datastore that keeps raw analytics. It coordinates the queue stored in MongoDB, runs a single background worker, and publishes health information that powers the platform’s `/health` checks.


# Overview

- Accepts deletion intents through the `/core/delete_granular_data` plugin hook.
- Persists each intent in the `deletion_manager` collection and protects it with retry and backoff semantics.
- Executes MongoDB deletions and, when available, ClickHouse mutations to keep both stores in sync.
- Reports queue state and ClickHouse pressure through the observability API so dashboards and probes can react.
- `deletion_manager` collection ensures an index on `deletion_completion_ts` with a three-day TTL (`expireAfterSeconds: 259200`). This automatically purges deleted entries.

### Components

- `deletionManager.js`
  - Defines `DELETION_STATUS` values and common helpers (e.g., loading ClickHouse pressure limits).
  - Registers `/master` bootstrap to ensure the TTL index on `deletion_completion_ts`.
  - Registers `/core/delete_granular_data` to enqueue deletion tasks into `deletion_manager`.
  - Registers `/system/observability/collect` provider (`provider: 'deletion'`) to expose queue summary and (if enabled) pending ClickHouse mutations.

- `deletionManagerJob.js`
  - Scheduled every minute; single-concurrency worker (`getConcurrency() = 1`).
  - Defers execution under high ClickHouse pressure based on thresholds.
  - Reserves up to `BATCH_LIMIT` oldest queued tasks, marks them `running`, and processes them.
  - Executes MongoDB deletions; if ClickHouse is enabled, schedules mutations and sets `awaiting_ch_mutation_validation`.
  - Re-checks mutation status periodically (`VALIDATION_INTERVAL_MS`); marks tasks `deleted` upon success.
  - Retries failures using `retry_at` and caps attempts with `MAX_RETRIES`; resets stale `running` tasks older than `STALE_MS`.

## Core Concepts

- **Status lifecycle**
  - `queued`: Pending processing.
  - `running`: Actively processed by the job.
  - `awaiting_ch_mutation_validation`: Waiting for a ClickHouse mutation to finish. It checks `system.mutations` table for this.
  - `failed`: After 3 retry, if it still get an error we mark them as failed.
  - `deleted`: Successfully removed from all targets. If clickhouse is enabled, it also ensures that mutation is done.
- **Additional fields**
  - `ts`: Enqueue timestamp.
  - `hb`: Last heartbeat written by the job.
  - `retry_at`: Earliest time the job will attempt the task again.
  - `error`: Last error message (if any).
  - `deletion_completion_ts`: Moment the deletion fully completed.

## Workflow

1. **Queueing**
   - The `/core/delete_granular_data` hook appends a document with `status=queued`. Each document holds the target database, collection, and query that needs to be deleted.
2. **Job execution**
   - `core/api/jobs/deletionManagerJob.js` runs **every minute** (cron `* * * * *`) with concurrency `1`, ensuring a single worker.
3. **Batch reservation**
   - Up to 10 tasks (`BATCH_LIMIT`) are reserved via aggregation, marked `running`, and tagged with a batch id.
4. **Deletion**
   - MongoDB deletions are performed first.
   - If ClickHouse is available, `clickhouseCoreQueries.deleteGranularDataByQuery` schedules a matching mutation.
5. **Mutation validation**
   - When ClickHouse is in play, tasks transition to `awaiting_ch_mutation_validation`. The job re-checks them every `VALIDATION_INTERVAL_MS` using `system.mutations`.
6. **Completion**
   - Success writes `status=deleted` and `deletion_completion_ts`.
   - Failures go through `markFailedOrRetry`, incrementing attempts and delaying via `retry_at`. After `MAX_RETRIES`, `status=failed`.


## Health & Observability

- Endpoint – `GET /o/system/observability` returns `{ healthy, issues, metrics, date }`.
- Health flag – `healthy` remains `true` while the `failed` count is zero. Failures flip the flag and list reasons in `issues` (these surface in `/health`).
- Metrics – Default payload includes:
  - `summary`: `queued`, `awaiting_validation`, `failed`, `deleted` (last 24h), and `oldest_wait_sec`.
  - `mutations`: ClickHouse pending mutation backlog and details.

### Adding More Metrics To Observability

```js
plugins.register('/system/observability/collect', async function() {
    return {
        provider: 'your_provider',
        metrics: 'your_metrics'
    };
});
```

## Configuration

- ClickHouse enablement – `countlyConfig.database.adapters.clickhouse.enabled = true` to activate ClickHouse side.
- Pressure thresholds – In `plugins` doc: `deletion_manager.ch_max_parts_per_partition`, `deletion_manager.ch_max_total_mergetree_parts`. When breached, the job defers.
- Job constants (see `core/api/jobs/deletionManagerJob.js`):
  - `STALE_MS`: Tasks running longer than 24h are reset. (We don't expect to have running status longer than 24h, but it could get stuck due to an error)
  - `RETRY_DELAY_MS`: Delay before retrying a failed task.
  - `MAX_RETRIES`: Maximum retry attempts before marking as failed.
  - `BATCH_LIMIT`: Maximum tasks reserved per run.


## Testing & Debugging

- Tests should not expect an empty `deletion_manager` collection when deletion is completed. Instead, wait for outstanding items with:
  `countDocuments({ status: { $ne: deletionManager.DELETION_STATUS.DELETED } })`.
- Logs: `job:deletionManager` (worker) and `api:deletionManager` (enqueue). Combine with observability output to pinpoint stalls.
