# ClickHouse Architecture Overview

Technical reference for Countly's ClickHouse integration.

## Deployment Modes

Mode is derived from boolean configuration flags:

| `shards` | `replicas` | `isCloud` | Mode | Use Case |
|----------|------------|-----------|------|----------|
| false | false | false | **Single** | Development, small installations |
| false | true | false | **Replicated** | Production (recommended) |
| true | false | false | **Sharded** | Horizontal scaling (no HA) |
| true | true | false | **HA** | Large-scale production |
| - | - | true | **Cloud** | ClickHouse Cloud managed |

## Engine Types by Mode

| Mode | `drill_events` | `uid_map` | Creates `_local` tables? |
|------|----------------|-----------|--------------------------|
| **Single** | MergeTree | ReplacingMergeTree | No |
| **Replicated** | Distributed → ReplicatedMergeTree | Distributed → ReplicatedReplacingMergeTree | Yes |
| **Sharded** | Distributed → MergeTree | Distributed → ReplacingMergeTree | Yes |
| **HA** | Distributed → ReplicatedMergeTree | Distributed → ReplicatedReplacingMergeTree | Yes |
| **Cloud** | MergeTree (managed) | ReplacingMergeTree (managed) | No |

## Table Names

| Table | Database | Single/Cloud | Cluster (local) | Cluster (distributed) |
|-------|----------|--------------|-----------------|----------------------|
| Events | `countly_drill` | `drill_events` | `drill_events_local` | `drill_events` |
| Snapshots | `countly_drill` | `drill_snapshots` | `drill_snapshots_local` | `drill_snapshots` |
| Identity | `identity` | `uid_map` | `uid_map_local` | `uid_map` |

## Operation Routing

| Operation | Single | Cluster (Replicated/Sharded/HA) | Cloud |
|-----------|--------|--------------------------------|-------|
| **SELECT** | `drill_events` | `drill_events` | `drill_events` |
| **INSERT** | `drill_events` | `drill_events`* | `drill_events` |
| **DELETE/UPDATE** | `drill_events` | `drill_events_local` ON CLUSTER | `drill_events` |
| **DDL** | `drill_events` | `drill_events_local` ON CLUSTER | Skipped (pre-create) |

*When `writeThrough=true` (default). If `writeThrough=false`, INSERT goes to `_local`.

## Sharding Keys

| Table | Sharding Expression | Behavior |
|-------|---------------------|----------|
| `drill_events` | `sipHash64(a, uid)` | Same app+user on same shard |
| `drill_snapshots` | `rand()` | Random distribution |
| `uid_map` | `sipHash64(a, uid)` | Same app+user on same shard |

## Configuration

```javascript
// api/config.js
clickhouse: {
    cluster: {
        name: 'countly_cluster',
        shards: false,   // Enable horizontal scaling
        replicas: false, // Enable high availability
        isCloud: false   // ClickHouse Cloud mode
    },
    distributed: {
        writeThrough: true,  // INSERT via distributed table
        insertDistributedSync: true
    },
    parallelReplicas: {
        enabled: false,      // Enable for replicated modes
        maxParallelReplicas: 2
    }
}
```

## Key API Methods

| Purpose | Method |
|---------|--------|
| Resolve table for SELECT | `QueryHelpers.resolveTable('drill_events')` |
| Resolve table for INSERT | `QueryHelpers.resolveTable('drill_events', { forInsert: true })` |
| Resolve table for mutation | `QueryHelpers.resolveTable('drill_events', { forMutation: true })` |
| Check cluster mode | `clusterManager.isClusterMode()` |
| Check cloud mode | `clusterManager.isCloudMode()` |
| Check if sharded | `clusterManager.isSharded()` |
| Check if replicated | `clusterManager.isReplicated()` |
| Get derived mode string | `clusterManager.getDeploymentMode()` |
| Get ON CLUSTER clause | `clusterManager.getOnClusterClause()` |

## Key Files

| File | Purpose |
|------|---------|
| `managers/ClusterManager.js` | Mode detection, engine generation, validation |
| `QueryHelpers.js` | Table resolution (`resolveTable()`) |
| `managers/SQLExecutor.js` | DDL execution with cluster transforms |
| `managers/DictionaryManager.js` | Dictionary creation and management |
| `users/Identity.js` | User identity resolution |
| `tables.js` | Table registry |

## Parallel Replicas

| Mode | Enable? | Reason |
|------|---------|--------|
| Single | No | No replicas to parallelize |
| Sharded | No | No replicas within shards |
| Replicated | Yes | Distributes queries across replicas |
| HA | Yes | Distributes queries within each shard |
| Cloud | Yes | Cloud manages replica distribution |

## Critical Validation Rules

| Configuration | Result |
|---------------|--------|
| `shards=true` + `writeThrough=false` | **FATAL ERROR** - Data won't route correctly |
| `parallelReplicas.enabled=true` + `replicas=false` | Warning - No benefit |

## See Also

- [SETUP_SINGLE_NODE.md](SETUP_SINGLE_NODE.md) - Single node setup
- [SETUP_REPLICATED.md](SETUP_REPLICATED.md) - Replicated setup (recommended)
- [SETUP_SHARDED.md](SETUP_SHARDED.md) - Sharded setup
- [SETUP_HA.md](SETUP_HA.md) - Full HA setup
- [SETUP_CLOUD.md](SETUP_CLOUD.md) - ClickHouse Cloud setup (includes DDL for pre-creation)
