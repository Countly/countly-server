# ClickHouse SQL Guide

SQL files in this directory are automatically executed during ClickHouse initialization.
They support all deployment modes: single-node, sharded, replicated, HA, and Cloud.

## Current Files

| File | Description |
|------|-------------|
| `01-drill_events.sql` | Main events table |
| `02-drill_events_indexes.sql` | Bloom filter index on uid |
| `03-drill-snapshots.sql` | Calculation snapshots (TTL: 1 hour) |
| `04-identity-database.sql` | Identity database |
| `05-identity-uid_map.sql` | User ID mapping table |

## File Naming Convention

Files are executed in alphabetical order. Use numeric prefixes:
- `01-table_name.sql` - Main table
- `02-table_name_indexes.sql` - Indexes
- `03-another_table.sql` - Another table

## SQL File Structure

```sql
-- @database: countly_drill
-- @table: my_table
-- @engine: MergeTree
-- @sharding: rand()

CREATE TABLE {{DATABASE}}.{{TABLE}} {{ON_CLUSTER}}
(
    column1 String,
    column2 UInt64
)
ENGINE = {{ENGINE}}
ORDER BY (column1);
```

## Metadata Header

| Tag | Required | Description |
|-----|----------|-------------|
| `@database` | Yes | Target database name |
| `@table` | Yes | Table name (without `_local` suffix) |
| `@engine` | For CREATE | Base engine: `MergeTree`, `ReplacingMergeTree(col)`, etc. |
| `@sharding` | For distributed | Sharding key for distributed table (e.g., `rand()`, `sipHash64(a, uid)`). **Required in cluster mode** - if omitted, no distributed table is created and only the local table will exist. |

## Placeholders

| Placeholder | Single Mode | Cluster Mode |
|-------------|-------------|--------------|
| `{{DATABASE}}` | `countly_drill` | `countly_drill` |
| `{{TABLE}}` | `my_table` | `my_table_local` |
| `{{ENGINE}}` | `MergeTree()` | `ReplicatedMergeTree(...)` |
| `{{ON_CLUSTER}}` | (empty) | `ON CLUSTER cluster_name` |

## What Happens in Each Mode

| Mode | Local Table | Distributed Table | Engine |
|------|-------------|-------------------|--------|
| single | `events` | - | `MergeTree()` |
| sharded | `events_local` | `events` | `MergeTree()` |
| replicated | `events_local` | `events` | `ReplicatedMergeTree(...)` |
| ha | `events_local` | `events` | `ReplicatedMergeTree(...)` |
| cloud | Skipped | Skipped | (managed externally) |

## Examples

### CREATE TABLE

```sql
-- @database: countly_drill
-- @table: events
-- @engine: MergeTree
-- @sharding: cityHash64(uid)

CREATE TABLE {{DATABASE}}.{{TABLE}} {{ON_CLUSTER}}
(
    uid String,
    event String,
    ts DateTime64(3)
)
ENGINE = {{ENGINE}}
PARTITION BY toYYYYMM(ts)
ORDER BY (uid, ts);
```

### ALTER TABLE (Indexes)

```sql
-- @database: countly_drill
-- @table: events

ALTER TABLE {{DATABASE}}.{{TABLE}} {{ON_CLUSTER}}
    ADD INDEX idx_event (event) TYPE bloom_filter GRANULARITY 4;
```

### ReplacingMergeTree

```sql
-- @database: identity
-- @table: uid_map
-- @engine: ReplacingMergeTree(updated_at)
-- @sharding: cityHash64(uid)

CREATE TABLE {{DATABASE}}.{{TABLE}} {{ON_CLUSTER}}
(
    uid String,
    canon String,
    updated_at DateTime64(3)
)
ENGINE = {{ENGINE}}
ORDER BY (uid);
```

## Field Mapping

Countly uses the following mappings when transferring event data from MongoDB to ClickHouse:

- **n → e**: Maps the MongoDB event name field (`n`) to the ClickHouse event name field (`e`).
  > **Note:** The `e` field is not updatable after insert.

## Recommended ClickHouse Settings

For optimal query performance, enable the following settings before running queries:

```sql
SET query_plan_optimize_lazy_materialization = 1;
SET optimize_move_to_prewhere = 1;
SET allow_suspicious_types_in_order_by = 1;
SET allow_suspicious_types_in_group_by = 1;
```

## Example Query

```sql
SELECT
    up.brw            AS browser,
    up.brwv           AS browser_version,
    up.p              AS platform,
    uniq(uid)        AS user_count,
    max(ts)          AS last_event_timestamp
FROM drill_events
WHERE e = '[CLY]_session'
GROUP BY
    browser,
    browser_version,
    platform
ORDER BY user_count DESC;
```

## Notes

- SQL files are standard ClickHouse SQL with placeholders
- Placeholders are replaced at runtime based on deployment mode
- Distributed tables are auto-generated from metadata
- Errors like "already exists" are silently ignored for idempotency
