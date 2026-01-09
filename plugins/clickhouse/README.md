# ClickHouse Plugin

Provides ClickHouse database client management, query services, and batch data ingestion for Countly.

## Features

- **Client Management**: Singleton ClickHouse client with optimized configuration
- **Query Service**: Advanced query execution with aggregation and response conversion
- **Event-Based Registration**: Registers client with `common.clickhouse` via plugin events
- **Cluster Support**: Multi-node deployment with sharding and replication
- **Identity Management**: User identity resolution and merge handling
- **Data Masking**: PII protection with configurable masking rules

## Architecture

```
plugins/clickhouse/
├── api/
│   ├── api.js                         # Plugin entry point with client registration
│   ├── ClickhouseClient.js            # Singleton client manager
│   ├── ClickhouseQueryService.js      # Query execution service
│   ├── QueryHelpers.js                # Query building utilities
│   ├── WhereClauseConverter.js        # MongoDB to ClickHouse filter conversion
│   ├── CursorPagination.js            # Cursor-based pagination utilities
│   ├── DataMaskingService.js          # PII/data masking service
│   ├── ingestor.js                    # Identity merge event handler
│   ├── health.js                      # Health check endpoints
│   ├── managers/                      # Manager classes
│   │   ├── ClusterManager.js          # Cluster configuration and DDL
│   │   ├── DictionaryManager.js       # ClickHouse dictionary management
│   │   └── SQLExecutor.js             # SQL file execution
│   ├── jobs/                          # Background jobs
│   ├── queries/                       # Query definitions
│   ├── sql/                           # SQL schema files
│   ├── users/                         # User/identity management
│   └── utils/                         # Utility functions
├── docs/                              # Documentation
├── package.json
├── install.js
├── uninstall.js
└── README.md
```

## Configuration

Add ClickHouse configuration to your Countly config file:

```javascript
// api/config.js
module.exports = {
    clickhouse: {
        url: "http://localhost:8123",
        username: "default", 
        password: "",
        database: "countly_drill",
        max_open_connections: 10,
        request_timeout: 1200000,
        clickhouse_settings: {
            async_insert: 1,
            wait_for_async_insert: 1,
            optimize_on_insert: 1,
            allow_experimental_object_type: 1,
            // Any additional ClickHouse settings can be added here
        }
    }
};
```

### Environment Variable Configuration

ClickHouse settings can be configured via environment variables. The `configextender.js` handles nested configuration dynamically:

```bash
# Basic connection settings
export COUNTLY_CONFIG__CLICKHOUSE_URL=http://clickhouse:8123
export COUNTLY_CONFIG__CLICKHOUSE_USERNAME=default
export COUNTLY_CONFIG__CLICKHOUSE_PASSWORD=mypassword
export COUNTLY_CONFIG__CLICKHOUSE_DATABASE=countly_drill

# Nested settings (compression)
export COUNTLY_CONFIG__CLICKHOUSE_COMPRESSION_REQUEST=false
export COUNTLY_CONFIG__CLICKHOUSE_COMPRESSION_RESPONSE=false

# Keep-alive settings
export COUNTLY_CONFIG__CLICKHOUSE_KEEP_ALIVE_ENABLED=true
export COUNTLY_CONFIG__CLICKHOUSE_KEEP_ALIVE_IDLE_SOCKET_TTL=10000

# ClickHouse-specific settings (any setting can be added)
export COUNTLY_CONFIG__CLICKHOUSE_CLICKHOUSE_SETTINGS_ASYNC_INSERT=1
export COUNTLY_CONFIG__CLICKHOUSE_CLICKHOUSE_SETTINGS_WAIT_FOR_ASYNC_INSERT=1
export COUNTLY_CONFIG__CLICKHOUSE_CLICKHOUSE_SETTINGS_OPTIMIZE_ON_INSERT=1
export COUNTLY_CONFIG__CLICKHOUSE_CLICKHOUSE_SETTINGS_ALLOW_EXPERIMENTAL_OBJECT_TYPE=1
export COUNTLY_CONFIG__CLICKHOUSE_CLICKHOUSE_SETTINGS_MAX_THREADS=0
export COUNTLY_CONFIG__CLICKHOUSE_CLICKHOUSE_SETTINGS_MAX_MEMORY_USAGE=10000000000
```

**Important Notes:**
- The `CLICKHOUSE_SETTINGS` object accepts any ClickHouse setting without explicit definition in configextender
- All keys under `clickhouse_settings` are automatically converted to lowercase
- New ClickHouse settings can be added via environment variables without code changes
- Use uppercase for the environment variable path, lowercase values will be generated

## Client Usage

The ClickHouse client is automatically registered with the common object:

```javascript
const common = require('../../api/utils/common.js');

// Client available after plugin initialization
if (common.clickhouse) {
    const result = await common.clickhouse.query({
        query: 'SELECT COUNT(*) FROM drill_events',
        format: 'JSONEachRow'
    });
}

// Query Service with appID for data masking
if (common.clickhouseQueryService) {
    // Include appID for privacy-compliant data redaction
    const result = await common.clickhouseQueryService.query({
        query: 'SELECT * FROM drill_events WHERE uid = {uid:String}',
        params: { uid: 'user123' },
        appID: 'your-app-id-here'  // Required for data masking
    });
    
    // Aggregate with appID for data masking
    const aggregated = await common.clickhouseQueryService.aggregate({
        query: 'SELECT uid, count() as cnt FROM drill_events WHERE date > {start:String} GROUP BY uid',
        params: { 
            start: '2025-01-01'
        },
        appID: 'your-app-id-here'  // Pass appID directly in pipeline (preferred) or in params for backward compatibility
    });
}
```

## Database Registration

The plugin automatically registers the ClickHouse client when initialized:

```javascript
// Dispatched by the plugin
plugins.dispatch('/database/register', {
    name: 'clickhouse',
    client: clickhouseClient,
    type: 'clickhouse', 
    description: 'ClickHouse analytics database'
});

// Results in: common.clickhouse = clickhouseClient
```

## Dependencies

- `@clickhouse/client`: Official ClickHouse Node.js client
- MongoDB change streams support (MongoDB 3.6+)
- Node.js streams for batch processing