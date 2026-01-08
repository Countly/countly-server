# Sharded Mode Setup

Sharded mode provides horizontal scaling across multiple shards without replication.

## Overview

- Multiple shards for horizontal scaling
- Single replica per shard (no high availability)
- Data distributed by sharding key
- Higher write throughput than single node

## When to Use

- Development/testing of sharding behavior
- Cost-sensitive environments where HA is not critical
- Temporary scaling before adding replication

**WARNING**: This mode has no data redundancy. If a shard node fails, data on that shard is lost until recovery. For production, use HA mode instead.

## Configuration

### Countly API Config (`api/config.js`)

```javascript
clickhouse: {
    url: "http://ch-shard1:8123",  // Any shard or load balancer
    database: "countly_drill",
    cluster: {
        name: 'countly_cluster',
        shards: true,             // Enable sharding
        replicas: false,          // No replication
        isCloud: false
    },
    replication: {
        coordinatorType: 'keeper',
        zkPath: '/clickhouse/tables/{shard}/{database}/{table}',
        replicaName: '{replica}'
    },
    parallelReplicas: {
        enabled: false            // No benefit without replicas
    },
    distributed: {
        writeThrough: true,       // CRITICAL: Must be true for correct shard routing
        insertDistributedSync: true
    }
}
```

### Kubernetes Environment Variables

```yaml
env:
  - name: COUNTLY_CONFIG__CLICKHOUSE_CLUSTER_SHARDS
    value: "true"
  - name: COUNTLY_CONFIG__CLICKHOUSE_CLUSTER_REPLICAS
    value: "false"
  - name: COUNTLY_CONFIG__CLICKHOUSE_CLUSTER_NAME
    value: "countly_cluster"
  - name: COUNTLY_CONFIG__CLICKHOUSE_DISTRIBUTED_WRITETHROUGH
    value: "true"  # CRITICAL
```

### K8s CHI config.env

```bash
SHARDS=3
REPLICAS=1
KEEPER_REPLICAS=1  # Minimal keeper for macros
```

## Table Routing

| Operation | Table Used | Notes |
|-----------|------------|-------|
| SELECT | `drill_events` (distributed) | Queries all shards |
| INSERT | `drill_events` (distributed) | Routes by sharding key |
| DELETE/UPDATE | `drill_events_local` ON CLUSTER | Runs on each shard |
| DDL | `drill_events_local` ON CLUSTER | Creates on all shards |

### Sharding Keys

| Table | Sharding Key | Behavior |
|-------|--------------|----------|
| `drill_events` | `sipHash64(a, uid)` | Same app+user data on same shard |
| `drill_snapshots` | `rand()` | Random distribution |
| `uid_map` | `sipHash64(a, uid)` | Same app+user on same shard |

## Engine Types

| Table | Engine |
|-------|--------|
| `drill_events_local` | MergeTree (NOT replicated) |
| `drill_events` | Distributed |
| `drill_snapshots_local` | MergeTree |
| `drill_snapshots` | Distributed |
| `uid_map_local` | ReplacingMergeTree |
| `uid_map` | Distributed |

## ClickHouse Server Config

### Cluster Configuration

```xml
<!-- /etc/clickhouse-server/config.d/cluster.xml -->
<clickhouse>
    <remote_servers>
        <countly_cluster>
            <shard>
                <weight>1</weight>
                <replica>
                    <host>ch-shard1</host>
                    <port>9000</port>
                </replica>
            </shard>
            <shard>
                <weight>1</weight>
                <replica>
                    <host>ch-shard2</host>
                    <port>9000</port>
                </replica>
            </shard>
            <shard>
                <weight>1</weight>
                <replica>
                    <host>ch-shard3</host>
                    <port>9000</port>
                </replica>
            </shard>
        </countly_cluster>
    </remote_servers>
</clickhouse>
```

### Macros Configuration (different on each shard)

```xml
<!-- /etc/clickhouse-server/config.d/macros.xml -->
<clickhouse>
    <macros>
        <shard>01</shard>          <!-- 01, 02, 03 on different shards -->
        <replica>ch-shard1</replica>
    </macros>
</clickhouse>
```

## Verification

1. Check cluster shards:
   ```sql
   SELECT * FROM system.clusters WHERE cluster = 'countly_cluster';
   -- Should show 3 shards with 1 replica each
   ```

2. Verify data distribution:
   ```sql
   SELECT
       hostName(),
       count() as events
   FROM countly_drill.drill_events_local
   GROUP BY hostName();
   ```

3. Check distributed table routes correctly:
   ```sql
   -- This should hit all shards
   SELECT count() FROM countly_drill.drill_events;
   ```

4. Check Countly logs for:
   ```
   ClusterManager initialized { shards: true, replicas: false, derivedMode: 'sharded' }
   ```

## Critical: writeThrough Setting

**`distributed.writeThrough` MUST be `true`** with sharding.

If set to `false`:
- Inserts go directly to local table on the connected node
- Data is NOT routed by sharding key
- All data ends up on one shard
- **This causes data loss and query failures**

The ClusterManager will throw a fatal error if this is misconfigured:
```
FATAL: distributed.writeThrough=false is not allowed with sharding
```

## Limitations

- **No High Availability**: Each shard is a single point of failure
- **No Parallel Replicas**: Cannot distribute read load within a shard
- **Data Loss Risk**: Shard failure means data is inaccessible until recovery

## Upgrading to HA Mode

To add replication for high availability:

1. Update config:
   ```javascript
   cluster: {
       shards: true,
       replicas: true  // Add replication
   }
   ```

2. Add additional ClickHouse nodes as replicas for each shard

3. Update cluster configuration (see SETUP_HA.md)
