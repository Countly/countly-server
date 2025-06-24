# QueryRunner Usage Guide

QueryRunner provides unified query execution across multiple database adapters (MongoDB, ClickHouse) with automatic adapter selection, forced execution, and comparison mode.

## Architecture

QueryRunner uses a strategy pattern for database abstraction:

```
API Request → QueryRunner → [MongoDB|ClickHouse|Future Adapters]
```

**Key Benefits:**
- Unified interface for different databases
- Performance comparison between adapters
- Migration support with fallback mechanisms
- Query debugging and audit trail

## Query Definition Structure

```javascript
const queryDef = {
    name: 'QUERY_NAME',           // Unique identifier
    adapters: {
        mongodb: {
            handler: async (params, options) => ({
                _queryMeta: { type: 'mongodb', query: pipeline },
                data: result
            }),
            available: true       // Optional, defaults to true
        },
        clickhouse: {
            handler: async (params, options) => ({
                _queryMeta: { type: 'clickhouse', query: sql },
                data: result
            }),
            available: true
        }
    }
};
```

### Handler Requirements

**Input:** `params` (query parameters), `options` (execution options)

**Output:** 
```javascript
{
    _queryMeta: {
        type: 'mongodb' | 'clickhouse',
        query: actualQuery              // Executed query for debugging
    },
    data: queryResults
}
```

## Comparison Mode

Executes queries on all available adapters to compare performance and validate consistency.

**Enable comparison mode:**
```javascript
const result = await queryRunner.executeQuery(queryDef, params, { comparison: true });
```

**Comparison logs include:**
- Execution duration per adapter
- Actual queries executed
- Raw and transformed results
- Success/error status

## Basic Usage

### Initialize and Execute

```javascript
// Initialize
const QueryRunner = require('./api/parts/data/QueryRunner.js');
common.queryRunner = new QueryRunner();

// Normal execution
const result = await common.queryRunner.executeQuery(queryDef, params);

// Force specific adapter
const result = await common.queryRunner.executeQuery(queryDef, params, { adapter: 'clickhouse' });

// Comparison mode
const result = await common.queryRunner.executeQuery(queryDef, params, { comparison: true });
```

## Best Practices

1. Always implement `_queryMeta` for debugging
2. Use transformation functions for data type differences  
3. Test with comparison mode during development
4. Monitor debug timing logs for performance issues