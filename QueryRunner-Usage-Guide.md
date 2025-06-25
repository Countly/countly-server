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
    name: 'QUERY_NAME',           // Unique identifier for logging/debugging
    adapters: {
        mongodb: {
            handler: async (params, options) => {
                // Example: Build MongoDB aggregation pipeline
                const pipeline = [
                    { $match: { app_id: params.app_id } },
                    { $group: { _id: null, total: { $sum: '$count' } } }
                ];
                const result = await db.collection('events').aggregate(pipeline).toArray();
                
                return {
                    _queryMeta: { 
                        type: 'mongodb', 
                        query: pipeline,
                        collection: 'events'    // Optional: additional metadata
                    },
                    data: result
                };
            },
            available: true       // Optional, defaults to true
        },
        clickhouse: {
            handler: async (params, options) => {
                // Example: Build ClickHouse SQL query
                const sql = `
                    SELECT SUM(count) as total 
                    FROM events 
                    WHERE app_id = {app_id:String}
                `;
                const result = await clickhouse.query(sql, { app_id: params.app_id });
                
                return {
                    _queryMeta: { 
                        type: 'clickhouse', 
                        query: sql
                    },
                    data: result.data
                };
            },
            transform: async (result, transformOptions) => {
                // Transform ClickHouse results to match expected format
                return result.data.map(row => ({
                    total: parseInt(row.total) || 0
                }));
            },
            available: true       // Optional, defaults to true
        }
    }
};
```

### Handler Requirements

**Input Parameters:**
- `params`: Query-specific parameters (app_id, date ranges, filters, etc.)
- `options` *(optional)*: Execution options (timeout, connection settings, etc.)

**Required Output Structure:** 
```javascript
{
    _queryMeta: {
        type: 'mongodb' | 'clickhouse',      // Adapter type
        query: actualQuery,                  // Executed query (pipeline/SQL) for debugging
        collection?: string,                 // Optional: MongoDB collection name
        // Add any other optional metadata fields as needed
    },
    data: queryResults                       // Raw query results
}
```

### Transform Function *(Optional)*

Each adapter can optionally define a transform function to normalize or process results:

**Transform Function Signature:**
```javascript
transform: async (result, transformOptions) => {
    // result: Full handler result with _queryMeta and data
    // transformOptions: Configuration object passed from executeQuery
    return transformedData;
}
```

**Transform Best Practices:**
- Only add transform when adapters return different data formats
- Transform functions should be lightweight and focused
- Handle data type differences (e.g., string to number conversion)
- MongoDB adapters often don't need transforms if data is already normalized

#### Handler Best Practices
- Always include `_queryMeta` with actual executed query for debugging
- Return consistent data structure across adapters when possible
- Handle errors gracefully and let them bubble up
- Use `options` parameter for adapter-specific settings

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

// With transform options
const transformOptions = { dateFormat: 'ISO', includeMetadata: true };
const result = await common.queryRunner.executeQuery(queryDef, params, {}, transformOptions);
```

## Best Practices

1. Always implement `_queryMeta` for debugging
2. Use adapter-specific transforms only when data formats differ between adapters
3. Keep transform functions lightweight and focused on format normalization
4. Test with comparison mode during development to validate adapter consistency
5. Monitor debug timing logs for performance issues
6. Prefer normalizing data in handlers over complex transforms when possible