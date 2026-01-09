# HA Mode Setup (Shards + Replicas)

HA mode provides both horizontal scaling (sharding) and high availability (replication).

## Overview

- Multiple shards for horizontal scaling
- Multiple replicas per shard for high availability
- Full fault tolerance with automatic failover
- Parallel replica queries for read scaling

## When to Use

- Large-scale production deployments
- High data volume requiring horizontal scaling
- Mission-critical systems requiring high availability
- Maximum query performance requirements

## Configuration

### Countly API Config (`api/config.js`)

```javascript
clickhouse: {
    url: "http://ch-lb:8123",  // Load balancer or any node
    database: "countly_drill",
    cluster: {
        name: 'countly_cluster',
        shards: true,             // Enable sharding
        replicas: true,           // Enable replication
        isCloud: false
    },
    replication: {
        coordinatorType: 'keeper',
        zkPath: '/clickhouse/tables/{shard}/{database}/{table}',
        replicaName: '{replica}'
    },
    parallelReplicas: {
        enabled: true,             // Enable for read scaling
        maxParallelReplicas: 2     // Replicas per shard to use
    },
    distributed: {
        writeThrough: true,        // CRITICAL: Must be true
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
    value: "true"
  - name: COUNTLY_CONFIG__CLICKHOUSE_CLUSTER_NAME
    value: "countly_cluster"
  - name: COUNTLY_CONFIG__CLICKHOUSE_PARALLELREPLICAS_ENABLED
    value: "true"
  - name: COUNTLY_CONFIG__CLICKHOUSE_DISTRIBUTED_WRITETHROUGH
    value: "true"
```

### K8s CHI config.env

```bash
# 2 shards x 2 replicas = 4 nodes
SHARDS=2
REPLICAS=2
KEEPER_REPLICAS=3
```

## Table Routing

| Operation | Table Used | Notes |
|-----------|------------|-------|
| SELECT | `drill_events` (distributed) | Queries all shards, parallel across replicas |
| INSERT | `drill_events` (distributed) | Routes by sharding key, replicates within shard |
| DELETE/UPDATE | `drill_events_local` ON CLUSTER | Runs on each local table |
| DDL | `drill_events_local` ON CLUSTER | Creates on all nodes |

### Sharding Keys

| Table | Sharding Key | Behavior |
|-------|--------------|----------|
| `drill_events` | `sipHash64(a, uid)` | Same app+user data on same shard |
| `drill_snapshots` | `rand()` | Random distribution |
| `uid_map` | `sipHash64(a, uid)` | Same app+user on same shard |

## Engine Types

| Table | Engine |
|-------|--------|
| `drill_events_local` | ReplicatedMergeTree |
| `drill_events` | Distributed |
| `drill_snapshots_local` | ReplicatedMergeTree |
| `drill_snapshots` | Distributed |
| `uid_map_local` | ReplicatedReplacingMergeTree |
| `uid_map` | Distributed |

## ClickHouse Server Config

### Cluster Configuration (2 shards x 2 replicas)

```xml
<!-- /etc/clickhouse-server/config.d/cluster.xml -->
<clickhouse>
    <remote_servers>
        <countly_cluster>
            <shard>
                <internal_replication>true</internal_replication>
                <replica>
                    <host>shard1-replica1</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>shard1-replica2</host>
                    <port>9000</port>
                </replica>
            </shard>
            <shard>
                <internal_replication>true</internal_replication>
                <replica>
                    <host>shard2-replica1</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>shard2-replica2</host>
                    <port>9000</port>
                </replica>
            </shard>
        </countly_cluster>
    </remote_servers>
</clickhouse>
```

### Macros Configuration (different on each node)

```xml
<!-- shard1-replica1 -->
<clickhouse>
    <macros>
        <shard>01</shard>
        <replica>shard1-replica1</replica>
    </macros>
</clickhouse>

<!-- shard1-replica2 -->
<clickhouse>
    <macros>
        <shard>01</shard>
        <replica>shard1-replica2</replica>
    </macros>
</clickhouse>

<!-- shard2-replica1 -->
<clickhouse>
    <macros>
        <shard>02</shard>
        <replica>shard2-replica1</replica>
    </macros>
</clickhouse>

<!-- shard2-replica2 -->
<clickhouse>
    <macros>
        <shard>02</shard>
        <replica>shard2-replica2</replica>
    </macros>
</clickhouse>
```

### ClickHouse Keeper Configuration

```xml
<!-- /etc/clickhouse-server/config.d/keeper.xml -->
<clickhouse>
    <keeper_server>
        <tcp_port>9181</tcp_port>
        <server_id>1</server_id>  <!-- Different on each Keeper node -->
        <log_storage_path>/var/lib/clickhouse/coordination/log</log_storage_path>
        <snapshot_storage_path>/var/lib/clickhouse/coordination/snapshots</snapshot_storage_path>
        <raft_configuration>
            <server>
                <id>1</id>
                <hostname>keeper1</hostname>
                <port>9444</port>
            </server>
            <server>
                <id>2</id>
                <hostname>keeper2</hostname>
                <port>9444</port>
            </server>
            <server>
                <id>3</id>
                <hostname>keeper3</hostname>
                <port>9444</port>
            </server>
        </raft_configuration>
    </keeper_server>

    <zookeeper>
        <node><host>keeper1</host><port>9181</port></node>
        <node><host>keeper2</host><port>9181</port></node>
        <node><host>keeper3</host><port>9181</port></node>
    </zookeeper>
</clickhouse>
```

## Verification

1. Check cluster topology:
   ```sql
   SELECT
       cluster, shard_num, replica_num, host_name
   FROM system.clusters
   WHERE cluster = 'countly_cluster'
   ORDER BY shard_num, replica_num;
   ```

2. Verify replication status:
   ```sql
   SELECT
       database, table, replica_name, is_leader,
       total_replicas, active_replicas, queue_size
   FROM system.replicas
   WHERE database IN ('countly_drill', 'identity');
   ```

3. Check data distribution across shards:
   ```sql
   SELECT
       hostName(),
       getMacro('shard') as shard,
       count() as events
   FROM clusterAllReplicas('countly_cluster', countly_drill.drill_events_local)
   GROUP BY hostName(), shard
   ORDER BY shard;
   ```

4. Check Countly logs for:
   ```
   ClusterManager initialized { shards: true, replicas: true, derivedMode: 'ha' }
   ```

## Parallel Replicas Behavior

With `parallelReplicas.enabled: true`, each shard's query is split across its replicas:

```
Query: SELECT count(*) FROM drill_events WHERE a = 'app1'

Execution:
  Shard 1: replica1 processes 50%, replica2 processes 50%
  Shard 2: replica1 processes 50%, replica2 processes 50%
  Results merged at coordinator
```

Settings applied:
- `enable_parallel_replicas=1`
- `max_parallel_replicas=2`
- `cluster_for_parallel_replicas='countly_cluster'`
- `parallel_replicas_for_non_replicated_merge_tree=1`

## Failover Behavior

### Replica Failure
- Queries automatically route to healthy replica within the shard
- Writes continue to remaining replicas
- Failed replica syncs automatically on recovery

### Shard Failure (all replicas down)
- Queries for data on that shard fail
- Other shards continue serving their data
- Recovery requires at least one replica to come back online

## Scaling

### Adding Shards
1. Add new shard nodes with proper macros
2. Update cluster.xml on all nodes
3. Redistribute data using ALTER TABLE ... MOVE PARTITION

### Adding Replicas
1. Add new replica nodes with proper macros
2. Update cluster.xml on all nodes
3. New replica syncs automatically from existing replicas

## Resource Planning

| Shards | Replicas | Total Nodes | Data Copies |
|--------|----------|-------------|-------------|
| 2 | 2 | 4 | 2 |
| 3 | 2 | 6 | 2 |
| 2 | 3 | 6 | 3 |
| 3 | 3 | 9 | 3 |

Plus 3 Keeper nodes (can be co-located with ClickHouse or separate).
