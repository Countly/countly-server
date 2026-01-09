# Single Node Setup

Single node deployment is the default mode for development and small installations.

## Overview

- Single ClickHouse server
- No replication (no high availability)
- No sharding (no horizontal scaling)
- Simplest setup, minimal infrastructure

## When to Use

- Development environments
- Small installations with low data volume
- Testing and evaluation

## Configuration

### Countly API Config (`api/config.js`)

```javascript
clickhouse: {
    url: "http://localhost:8123",
    database: "countly_drill",
    cluster: {
        name: 'countly_cluster',  // Not used in single mode
        shards: false,            // No sharding
        replicas: false,          // No replication
        isCloud: false
    },
    parallelReplicas: {
        enabled: false            // No benefit without replicas
    }
}
```

### Kubernetes Environment Variables

```yaml
env:
  - name: COUNTLY_CONFIG__CLICKHOUSE_CLUSTER_SHARDS
    value: "false"
  - name: COUNTLY_CONFIG__CLICKHOUSE_CLUSTER_REPLICAS
    value: "false"
  - name: COUNTLY_CONFIG__CLICKHOUSE_URL
    value: "http://clickhouse:8123"
```

### K8s CHI config.env

```bash
SHARDS=1
REPLICAS=1
KEEPER_REPLICAS=0  # Keeper not needed for single node
```

## Table Routing

| Operation | Table Used | Notes |
|-----------|------------|-------|
| SELECT | `drill_events` | Direct query |
| INSERT | `drill_events` | Direct insert |
| DELETE/UPDATE | `drill_events` | Direct mutation |
| DDL | `drill_events` | Direct schema change |

## Engine Types

| Table | Engine |
|-------|--------|
| `drill_events` | MergeTree |
| `drill_snapshots` | MergeTree |
| `uid_map` | ReplacingMergeTree |

## ClickHouse Server Config

No cluster configuration needed. Basic standalone config:

```xml
<clickhouse>
    <!-- No remote_servers or macros needed for single node -->
</clickhouse>
```

## Verification

1. Check ClickHouse is running:
   ```bash
   curl http://localhost:8123/ping
   ```

2. Verify tables were created:
   ```sql
   SHOW TABLES FROM countly_drill;
   -- Should show: drill_events, drill_snapshots

   SHOW TABLES FROM identity;
   -- Should show: uid_map
   ```

3. Check Countly logs for:
   ```
   ClusterManager initialized { shards: false, replicas: false, derivedMode: 'single' }
   ```

## Limitations

- **No High Availability**: If the server goes down, data is inaccessible
- **No Horizontal Scaling**: Limited by single server resources
- **No Parallel Queries**: Cannot distribute query load

## Upgrading to Cluster Mode

To upgrade to replicated mode for high availability:

1. Update config:
   ```javascript
   cluster: {
       shards: false,
       replicas: true,  // Enable replication
       name: 'countly_cluster'
   }
   ```

2. Set up additional ClickHouse servers with cluster configuration

3. Migrate existing data (see SETUP_REPLICATED.md)
