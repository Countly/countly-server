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

```typescript
interface QueryDefinition<TParams = unknown, TResult = unknown> {
    name: string;           // Unique identifier for logging/debugging
    adapters: {
        mongodb?: AdapterConfig<TParams, TResult>;
        clickhouse?: AdapterConfig<TParams, TResult>;
    };
}

interface AdapterConfig<TParams = unknown, TResult = unknown> {
    handler: QueryHandler<TParams, TResult>;
    transform?: TransformFunction<TResult>;
    available?: boolean;    // Optional, defaults to true
}
```

**Example implementation:**
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
                        adapter: 'mongodb',     // Required: adapter name
                        query: pipeline         // Required: actual executed query
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
                        adapter: 'clickhouse',  // Required: adapter name
                        query: sql              // Required: actual executed query
                    },
                    data: result.data
                };
            },
            transform: async (data, transformOptions) => {
                // Transform ClickHouse results to match expected format
                // Note: transform receives only the data portion, not full result
                return data.map(row => ({
                    total: parseInt(row.total) || 0
                }));
            },
            available: true       // Optional, defaults to true
        }
    }
};
```

### Handler Requirements

**TypeScript Signature:**
```typescript
type QueryHandler<TParams = unknown, TResult = unknown> = (
    params: TParams,
    options?: ExecutionOptions
) => Promise<QueryResult<TResult>>;

interface QueryResult<TData = unknown> {
    _queryMeta: QueryMeta;
    data: TData;
}

interface QueryMeta {
    adapter: AdapterName;    // 'mongodb' | 'clickhouse'
    query: unknown;          // The actual query/pipeline executed
}
```

**Input Parameters:**
- `params`: Query-specific parameters (app_id, date ranges, filters, etc.)
- `options` *(optional)*: ExecutionOptions (adapter, comparison mode, etc.)

**Required Output Structure:** 
```javascript
{
    _queryMeta: {
        adapter: 'mongodb' | 'clickhouse',   // Required: adapter name
        query: actualQuery                   // Required: executed query for debugging
    },
    data: queryResults                       // Raw query results
}
```

### Transform Function *(Optional)*

Each adapter can optionally define a transform function to normalize or process results:

**Transform Function Signature:**
```typescript
type TransformFunction<TInput = unknown, TOutput = unknown> = (
    data: TInput,
    transformOptions?: Record<string, unknown>
) => Promise<TOutput>;
```

**Implementation:**
```javascript
transform: async (data, transformOptions) => {
    // data: Only the data portion from handler result (not full QueryResult)
    // transformOptions: Configuration object passed from executeQuery
    return transformedData;
}
```

**Transform Best Practices:**
- Only add transform when adapters return different data formats
- Transform functions should be lightweight and focused
- Handle data type differences (e.g., string to number conversion)
- MongoDB adapters often don't need transforms if data is already normalized
- Transform receives only the `data` portion, not the full `QueryResult` object

#### Handler Best Practices
- Always include `_queryMeta` with `adapter` name and actual executed `query` for debugging
- Return consistent data structure across adapters when possible
- Handle errors gracefully and let them bubble up
- Use `options` parameter for execution-related settings (not adapter-specific configs)
- Follow TypeScript interfaces for type safety

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

// Normal execution - returns only transformed data, not full QueryResult
const result = await common.queryRunner.executeQuery(queryDef, params);

// Force specific adapter
const result = await common.queryRunner.executeQuery(queryDef, params, { adapter: 'clickhouse' });

// Comparison mode - logs detailed comparison data to files
const result = await common.queryRunner.executeQuery(queryDef, params, { comparison: true });

// With transform options
const transformOptions = { dateFormat: 'ISO', includeMetadata: true };
const result = await common.queryRunner.executeQuery(queryDef, params, {}, transformOptions);
```

### TypeScript Usage

```typescript
import QueryRunner, { QueryDefinition, ExecutionOptions } from './types/QueryRunner';

// Type-safe query definition
const queryDef: QueryDefinition<{app_id: string}, {total: number}[]> = {
    name: 'GET_EVENT_TOTALS',
    adapters: {
        mongodb: {
            handler: async (params, options) => {
                // Implementation with type safety
                return {
                    _queryMeta: { adapter: 'mongodb', query: pipeline },
                    data: results
                };
            }
        }
    }
};

// Type-safe execution
const result: {total: number}[] = await queryRunner.executeQuery(queryDef, { app_id: 'test' });
```

## Best Practices

1. Always implement `_queryMeta` with correct `adapter` name and `query` fields
2. Use adapter-specific transforms only when data formats differ between adapters  
3. Keep transform functions lightweight and focused on format normalization
4. Test with comparison mode during development to validate adapter consistency
5. Monitor debug timing logs for performance issues
6. Prefer normalizing data in handlers over complex transforms when possible
7. Use TypeScript definitions for type safety and better IDE support
8. Remember that `executeQuery` returns only the transformed data, not the full `QueryResult`
9. Transform functions receive only the `data` portion, not the complete handler result