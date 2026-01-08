# ClickHouse Cloud Setup

ClickHouse Cloud is a fully managed service where infrastructure is handled externally.

## Overview

- Managed sharding and replication
- No DDL execution by Countly (schema must be pre-created)
- Automatic scaling and failover
- Parallel replicas supported

## When to Use

- When using ClickHouse Cloud managed service
- Serverless or dedicated ClickHouse Cloud instances
- When you want to avoid infrastructure management

## Configuration

### Countly API Config (`api/config.js`)

```javascript
clickhouse: {
    url: "https://xxxx.clickhouse.cloud:8443",
    username: "default",
    password: "your_password",
    database: "countly_drill",
    cluster: {
        name: 'default',          // ClickHouse Cloud uses 'default' cluster
        shards: false,            // Ignored in Cloud mode
        replicas: false,          // Ignored in Cloud mode
        isCloud: true             // CRITICAL: Enables Cloud mode
    },
    dictionary: {
        nativePort: 9440,         // Cloud uses 9440 for native TLS
        secure: true              // Enable TLS for dictionary connections
    },
    parallelReplicas: {
        enabled: true,
        maxParallelReplicas: 4,
        clusterForParallelReplicas: 'default'
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
  - name: COUNTLY_CONFIG__CLICKHOUSE_CLUSTER_ISCLOUD
    value: "true"
  - name: COUNTLY_CONFIG__CLICKHOUSE_CLUSTER_NAME
    value: "default"
  - name: COUNTLY_CONFIG__CLICKHOUSE_URL
    value: "https://xxxx.clickhouse.cloud:8443"
  - name: COUNTLY_CONFIG__CLICKHOUSE_USERNAME
    value: "default"
  - name: COUNTLY_CONFIG__CLICKHOUSE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: clickhouse-credentials
        key: password
  - name: COUNTLY_CONFIG__CLICKHOUSE_DICTIONARY_NATIVEPORT
    value: "9440"
  - name: COUNTLY_CONFIG__CLICKHOUSE_DICTIONARY_SECURE
    value: "true"
  - name: COUNTLY_CONFIG__CLICKHOUSE_PARALLELREPLICAS_ENABLED
    value: "true"
```

## Table Routing

In Cloud mode, Countly uses base table names. ClickHouse Cloud handles distribution internally.

| Operation | Table Used | Notes |
|-----------|------------|-------|
| SELECT | `drill_events` | Cloud routes to replicas |
| INSERT | `drill_events` | Cloud handles distribution |
| DELETE/UPDATE | `drill_events` | Cloud handles across replicas |
| DDL | N/A | **Skipped - must pre-create** |

## Pre-Create Schema

**CRITICAL**: In Cloud mode, Countly does NOT create tables or dictionaries. You must pre-create them.

### Required Tables

```sql
-- Database 1: countly_drill
CREATE DATABASE IF NOT EXISTS countly_drill;

CREATE TABLE countly_drill.drill_events
(
    a      LowCardinality(String),
    e      LowCardinality(String),
    n      String,
    uid    String,
    uid_canon Nullable(String),
    did    String,
    lsid   String,
    _id    String,
    ts     DateTime64(3),
    up     JSON(max_dynamic_paths = 32),
    custom JSON(max_dynamic_paths = 0),
    cmp    JSON(max_dynamic_paths = 0),
    sg     JSON(max_dynamic_paths = 0),
    c      UInt32,
    s      Float64,
    dur    UInt32,
    lu     Nullable(DateTime64(3)) CODEC (Delta, LZ4),
    cd     DateTime64(3) DEFAULT now64(3) CODEC (Delta, LZ4)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts, 'UTC')
ORDER BY (a, e, n, ts)
SETTINGS
    index_granularity = 8192;

CREATE TABLE countly_drill.drill_snapshots
(
    _id         String,
    calculating UInt64,
    u           UInt32,
    t           UInt32,
    s           Float64,
    s0          String,
    s1          String,
    s2          String,
    s3          String,
    s4          String,
    dur         Float64,
    cd          DateTime64(3) DEFAULT now64(3) CODEC (Delta, LZ4),
    lu          DateTime64(3) DEFAULT now64(3) CODEC (Delta, LZ4)
)
ENGINE = MergeTree
ORDER BY (cd, _id)
TTL cd + INTERVAL 1 HOUR;

-- Database 2: identity
CREATE DATABASE IF NOT EXISTS identity;

CREATE TABLE identity.uid_map
(
    a               String,
    uid             String,
    canon           String,
    change_ts       DateTime64(3),
    updated_at      DateTime64(3) DEFAULT now64(3),
    ver_ms          UInt64 ALIAS toUInt64(toUnixTimestamp64Milli(change_ts))
)
ENGINE = ReplacingMergeTree(change_ts)
ORDER BY (a, uid);
```

### Required Dictionary

```sql
CREATE DICTIONARY identity.uid_map_dict
(
    a String,
    uid String,
    canon String
)
PRIMARY KEY a, uid
SOURCE(CLICKHOUSE(
    HOST 'localhost'
    PORT 9440
    SECURE 1
    USER 'default'
    PASSWORD 'your_password'
    DB 'identity'
    QUERY 'SELECT a, uid, argMax(canon,(change_ts,updated_at)) AS canon FROM identity.uid_map WHERE change_ts > now() - INTERVAL 31 DAY GROUP BY a, uid'
))
LAYOUT(COMPLEX_KEY_HASHED())
LIFETIME(MIN 60 MAX 120);
```

### Required Index

```sql
ALTER TABLE countly_drill.drill_events
    ADD INDEX uid_bloom (uid) TYPE bloom_filter(0.01) GRANULARITY 4;
```

## Verification

1. Verify connection:
   ```bash
   curl "https://xxxx.clickhouse.cloud:8443/?query=SELECT%201"
   ```

2. Check schema exists:
   ```sql
   SHOW TABLES FROM countly_drill;
   SHOW TABLES FROM identity;
   SHOW DICTIONARIES FROM identity;
   ```

3. Check Countly logs for:
   ```
   ClusterManager initialized { shards: false, replicas: false, derivedMode: 'cloud' }
   Cloud/external schema mode - skipping DDL, validating schema exists
   ClickHouse schema validation passed
   ```

4. If schema is missing, you'll see:
   ```
   ClickHouse schema validation failed (Cloud mode).
   Missing objects:
     - Missing table: countly_drill.drill_events (Events table)
   In Cloud mode, you must pre-create all schema objects before starting Countly.
   ```

## TLS/SSL Configuration

ClickHouse Cloud requires TLS. Ensure:

1. URL uses `https://` protocol
2. Dictionary uses port `9440` (native TLS port)
3. Dictionary has `SECURE 1` in source

```javascript
clickhouse: {
    url: "https://xxxx.clickhouse.cloud:8443",  // HTTPS
    dictionary: {
        nativePort: 9440,  // Native TLS port
        secure: true       // Enable TLS
    }
}
```

## Parallel Replicas

ClickHouse Cloud supports parallel replicas. Enable for read scaling:

```javascript
parallelReplicas: {
    enabled: true,
    maxParallelReplicas: 4,
    clusterForParallelReplicas: 'default'
}
```

## Cloud vs Self-Managed Comparison

| Feature | Cloud | Self-Managed |
|---------|-------|--------------|
| Schema creation | Manual pre-create | Automatic |
| Scaling | Automatic | Manual |
| Failover | Automatic | Automatic (with replicas) |
| Keeper/ZooKeeper | Managed | Self-managed |
| TLS | Required | Optional |
| Dictionary port | 9440 | 9000 |

## Troubleshooting

### Schema Validation Failed

```
ClickHouse schema validation failed (Cloud mode).
```

Solution: Pre-create all required tables and dictionaries (see above).

### Dictionary Connection Failed

```
Dictionary identity.uid_map_dict load failed
```

Solution: Ensure dictionary source uses:
- Port 9440 (not 9000)
- SECURE 1
- Correct credentials

### TLS Certificate Errors

```
SSL certificate problem
```

Solution: Ensure your environment trusts the ClickHouse Cloud CA certificate.
