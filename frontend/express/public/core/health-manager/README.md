# Health Manager

Health Manager groups backend health views under one Management entry (`#/manage/health`). The set of tabs is dynamic: Mutation Status is available today, and additional metrics can be enabled here.

## Access & Navigation
- Visible to users with the `core` permission
- Sidebar: Management → Health Manager.
- Routes: `#/manage/health` and `#/manage/health/mutation-status`.

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
- Runs a single-concurrency job (`core/api/jobs/mutationManagerJob.js`) every minute to reserve batches, process Mongo updates/deletes, and, when ClickHouse is enabled, schedule matching mutations.
- Status lifecycle: `queued` → `running` → (optional) `awaiting_ch_mutation_validation` → `completed` or `failed` (after max retries).
- Fields: `ts`, `hb`, `retry_at`, `error`, `mutation_completion_ts` (used by the TTL index to purge old completed items).
- Observability: registers `/system/observability/collect` with provider `mutation`, exposing queue summary and ClickHouse pressure so the UI and probes can react.

## Aggregator Status (UI)
The tab is currently commented out in the UI; enable once aggregator data is available by re-registering the tab in `countly.views.js`.
