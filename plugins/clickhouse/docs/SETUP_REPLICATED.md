# Replicated Mode Setup (Recommended)

Replicated mode provides high availability with multiple replicas of all data.

## Overview

- Single shard with multiple replicas
- All data replicated to all nodes
- Automatic failover
- Read scaling via parallel replicas
- **Recommended for production deployments**

## When to Use

- Production environments requiring high availability
- Moderate data volumes that fit on a single shard
- When read scaling is more important than write scaling

## Configuration

### Countly API Config (`api/config.js`)

```javascript
clickhouse: {
    url: "http://ch-node1:8123",  // Any replica node or load balancer
    database: "countly_drill",
    cluster: {
        name: 'countly_cluster',  // Must match ClickHouse cluster name
        shards: false,            // Single shard
        replicas: true,           // Enable replication
        isCloud: false
    },
    replication: {
        coordinatorType: 'keeper', // or 'zookeeper'
        zkPath: '/clickhouse/tables/{shard}/{database}/{table}',
        replicaName: '{replica}'
    },
    parallelReplicas: {
        enabled: true,             // Recommended for read scaling
        maxParallelReplicas: 3     // Number of replicas to use
    },
    distributed: {
        writeThrough: true,
        insertDistributedSync: true
    }
}
```

### Kubernetes Environment Variables

```yaml
env:
  - name: COUNTLY_CONFIG__CLICKHOUSE_CLUSTER_SHARDS
    value: "false"
  - name: COUNTLY_CONFIG__CLICKHOUSE_CLUSTER_REPLICAS
    value: "true"
  - name: COUNTLY_CONFIG__CLICKHOUSE_CLUSTER_NAME
    value: "countly_cluster"
  - name: COUNTLY_CONFIG__CLICKHOUSE_PARALLELREPLICAS_ENABLED
    value: "true"
  - name: COUNTLY_CONFIG__CLICKHOUSE_PARALLELREPLICAS_MAXPARALLELREPLICAS
    value: "3"
```

### K8s CHI config.env

```bash
SHARDS=1
REPLICAS=3
KEEPER_REPLICAS=3
```

## Table Routing

| Operation | Table Used | Notes |
|-----------|------------|-------|
| SELECT | `drill_events` (distributed) | Queries any replica |
| INSERT | `drill_events` (distributed) | Replicates to all nodes |
| DELETE/UPDATE | `drill_events_local` ON CLUSTER | Runs on each replica |
| DDL | `drill_events_local` ON CLUSTER | Creates on all replicas |

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

### Cluster Configuration (each node)

```xml
<!-- /etc/clickhouse-server/config.d/cluster.xml -->
<clickhouse>
    <remote_servers>
        <countly_cluster>
            <shard>
                <internal_replication>true</internal_replication>
                <replica>
                    <host>ch-node1</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>ch-node2</host>
                    <port>9000</port>
                </replica>
                <replica>
                    <host>ch-node3</host>
                    <port>9000</port>
                </replica>
            </shard>
        </countly_cluster>
    </remote_servers>
</clickhouse>
```

### Macros Configuration (different on each node)

```xml
<!-- /etc/clickhouse-server/config.d/macros.xml -->
<clickhouse>
    <macros>
        <shard>01</shard>
        <replica>ch-node1</replica>  <!-- ch-node2, ch-node3 on other nodes -->
    </macros>
</clickhouse>
```

### ClickHouse Keeper Configuration

```xml
<!-- /etc/clickhouse-server/config.d/keeper.xml -->
<clickhouse>
    <keeper_server>
        <tcp_port>9181</tcp_port>
        <server_id>1</server_id>  <!-- 2, 3 on other nodes -->
        <log_storage_path>/var/lib/clickhouse/coordination/log</log_storage_path>
        <snapshot_storage_path>/var/lib/clickhouse/coordination/snapshots</snapshot_storage_path>
        <raft_configuration>
            <server>
                <id>1</id>
                <hostname>ch-node1</hostname>
                <port>9444</port>
            </server>
            <server>
                <id>2</id>
                <hostname>ch-node2</hostname>
                <port>9444</port>
            </server>
            <server>
                <id>3</id>
                <hostname>ch-node3</hostname>
                <port>9444</port>
            </server>
        </raft_configuration>
    </keeper_server>

    <zookeeper>
        <node>
            <host>ch-node1</host>
            <port>9181</port>
        </node>
        <node>
            <host>ch-node2</host>
            <port>9181</port>
        </node>
        <node>
            <host>ch-node3</host>
            <port>9181</port>
        </node>
    </zookeeper>
</clickhouse>
```

## Verification

1. Check cluster is configured:
   ```sql
   SELECT * FROM system.clusters WHERE cluster = 'countly_cluster';
   ```

2. Verify replication is working:
   ```sql
   SELECT
       database, table, replica_name, is_leader,
       total_replicas, active_replicas
   FROM system.replicas
   WHERE database IN ('countly_drill', 'identity');
   ```

3. Check Keeper is healthy:
   ```bash
   echo ruok | nc localhost 9181
   # Should return: imok
   ```

4. Check Countly logs for:
   ```
   ClusterManager initialized { shards: false, replicas: true, derivedMode: 'replicated' }
   ```

## Parallel Replicas

With `parallelReplicas.enabled: true`, queries are distributed across replicas:

```sql
-- This query will be split across 3 replicas
SELECT count(*) FROM countly_drill.drill_events WHERE ts > now() - INTERVAL 1 DAY;
```

Settings applied:
- `enable_parallel_replicas=1`
- `max_parallel_replicas=3`
- `cluster_for_parallel_replicas='countly_cluster'`

## Failover Behavior

- If one replica fails, queries automatically route to healthy replicas
- Writes continue to the remaining replicas
- When the failed replica recovers, it syncs automatically from Keeper
- No manual intervention required for recovery

## Limitations

- **Single shard**: Limited by largest server's storage capacity
- **Write scaling**: All writes go to all replicas (linear with replica count)

## Upgrading to HA Mode

To add sharding for horizontal scaling:

1. Update config:
   ```javascript
   cluster: {
       shards: true,   // Enable sharding
       replicas: true  // Keep replication
   }
   ```

2. Add more ClickHouse nodes for additional shards

3. Update cluster configuration (see SETUP_HA.md)
