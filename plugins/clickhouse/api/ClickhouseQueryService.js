const log = require('../../../api/utils/log.js')('clickhouse:query-service');
const { Transform } = require('stream');
const { isProgressRow } = require('@clickhouse/client-common');
const DataMaskingService = require('./DataMaskingService');
const plugins = require('../../pluginManager.js');
const QueryHelpers = require('./QueryHelpers');

// Query size thresholds for max_query_size override
const QUERY_SIZE_THRESHOLD = 20 * 1024; // 20KB - trigger for large query mode
const LARGE_QUERY_MAX_SIZE = 16 * 1024 * 1024; // 16MB - for large cohort queries

/**
 * ClickHouse-backed implementation of the DrillEvents repository.
 */
class ClickhouseQueryService {
    /**
     * @param {ClickHouseClient} client ClickHouse client instance.
     */
    constructor(client) {
        this.client = client;
        this.maskingService = new DataMaskingService();

        // Set plugins reference for masking service if available
        if (plugins) {
            this.maskingService.setPlugins(plugins);
        }

        log.d('ClickHouse query service initialized');
    }

    /**
     * Find events matching a filter.
     * @param {Filter} [filter] - Filter criteria.
     * @param {FindOptions} [options] - Optional find options.
     * @returns {Promise<any[]>} Resolves to an array of matching events.
     */
    async find(filter, options) {
        // TODO: implement
        log.d("Executing 'find' method (not implemented)", { filter, options });
        return [];
    }

    /**
     * Execute a raw query with parameters.
     * @param {Object} queryObj - Query object with query and params.
     * @param {string} queryObj.query - SQL query string.
     * @param {Object} [queryObj.params] - Query parameters for parameterized queries.
     * @param {string} [queryObj.appID] - Application ID for data masking. Required for privacy-compliant data redaction.
     * @returns {Promise<any[]>} Resolves to query results.
     */
    async query(queryObj) {
        log.d('Executing raw ClickHouse query:', queryObj);
        const startTime = Date.now();

        try {
            if (queryObj?.appID) {
                queryObj.appID = queryObj?.appID.toString();
                this.maskingService.setAppId(queryObj.appID);
            }

            // Attempt to mask query string
            const maskAttempt = this.maskingService.maskQueryString(queryObj.query, queryObj.params);
            const maskedQuery = maskAttempt.masked ? maskAttempt.query : null;

            // Execute masked query first; on failure, fallback to original and apply result-level masking
            if (maskedQuery) {
                try {
                    let resultSet = await this.client.query({
                        query: maskedQuery,
                        format: 'JSONEachRow',
                        query_params: queryObj.params
                    });
                    const result = await resultSet.json();
                    const durationOk = Date.now() - startTime;
                    log.d(`ClickHouse query completed in ${durationOk}ms`);
                    return result; // masked at query level, return as-is
                }
                catch (maskedErr) {
                    log.w('Masked query failed, falling back to original query and result-level masking', maskedErr);
                    let resultSet = await this.client.query({
                        query: queryObj.query,
                        format: 'JSONEachRow',
                        query_params: queryObj.params
                    });
                    const fallback = await resultSet.json();
                    const maskedResult = this.maskingService.maskResults(fallback, queryObj.query);

                    const durationFb = Date.now() - startTime;
                    log.d(`ClickHouse query completed in ${durationFb}ms (fallback applied)`);
                    return maskedResult;
                }
            }

            // No query-level masking; execute original and mask results
            {
                let resultSet = await this.client.query({
                    query: queryObj.query,
                    format: 'JSONEachRow',
                    query_params: queryObj.params
                });
                const result = await resultSet.json();
                const maskedResult = this.maskingService.maskResults(result, queryObj.query);

                const duration = Date.now() - startTime;
                log.d(`ClickHouse query completed in ${duration}ms`);
                return maskedResult;
            }

        }
        catch (e) {
            const duration = Date.now() - startTime;
            log.e(`ClickHouse query failed after ${duration}ms`, e);
            throw e;
        }
    }

    /**
     * Find a single event matching a filter.
     * @param {Filter} filter - Filter criteria.
     * @param {FindOptions} [options] - Optional find options.
     * @returns {Promise<any|null>} Resolves to the found event or null if none.
     */
    async findOne(filter, options) {
        // TODO: implement
        log.d("Executing 'findOne' method (not implemented)", { filter, options });
        return null;
    }

    /**
     * Count events matching a filter.
     * @param {Filter} [filter] - Filter criteria.
     * @returns {Promise<number>} Resolves to the count of matching events.
     */
    async count(filter) {
        // TODO: implement
        log.d("Executing 'count' method (not implemented)", { filter });
        return 0;
    }

    /**
     * Aggregate events using a pipeline.
     * @param {Object} pipeline - Aggregation pipeline stages.
     * @param {string} pipeline.query - SQL query string with parameter placeholders
     * @param {Object} [pipeline.params] - Query parameters to replace placeholders
     * @param {string} [pipeline.appID] - Application ID for data masking. Required for privacy-compliant data redaction. If not provided, will fall back to pipeline.params.appID for backward compatibility.
     * @param {AggregateOptions} [options] - Optional aggregation options.
     * @param {boolean} [options.stream] - If true, returns a readable stream instead of Promise
     * @param {boolean} [options.progress=false] - If true, runs the query with ClickHouse format `JSONEachRowWithProgress` and emits progress frames via `onProgress`.
     * @param {Function} [options.onProgress] - Progress callback. Receives one argument: an object with fields like `read_rows`, `read_bytes`, `total_rows_to_read`, and `elapsed_ns` (values are strings).
     * @param {string} [options.adapter] - Database adapter to use
     * @returns {Promise<any[]>|Stream} Resolves to an array of aggregated results, or returns a readable stream if options.stream is true
     * 
     * @example
     * // Regular aggregation (returns Promise)
     * const results = await service.aggregate({
     *   query: "SELECT bucket_id, uid FROM events WHERE date >= {start_date:String}",
     *   params: { start_date: "2025-01-01" },
     *   appID: "your-app-id-here"  // Pass appID for data masking
     * });
     * 
     * @example
     * // Streaming aggregation (returns Stream)
     * const stream = service.aggregate({
     *   query: "SELECT bucket_id, uid FROM events WHERE date >= {start_date:String}",
     *   params: { start_date: "2025-01-01" }
     * }, { stream: true });
     * 
     * stream.on('data', (row) => {
     *   console.log('Received row:', row);
     * });
     * 
     * stream.on('error', (err) => {
     *   console.error('Stream failed:', err);
     * });
     * 
     * stream.on('end', () => {
     *   console.log('Stream completed');
     * });
     * 
     * @example
     * // Aggregation with progress (non-stream)
     * const result = await service.aggregate(
     *   {
     *     query: "SELECT bucket_id, uid FROM events WHERE date >= {start_date:String}",
     *     params: { start_date: "2025-01-01" }
     *   },
     *   {
     *     progress: true,
     *     onProgress: function (p) {
     *       var read  = Number(p.read_rows || 0);
     *       var total = Number(p.total_rows_to_read || 0);
     *       var percent = total > 0 ? Math.round((read / total) * 100) : undefined;
     *       console.log('Progress %:', percent == null ? 'N/A' : percent);
     *     }
     *   }
     * );
     */
    async aggregate(pipeline, options) {
        log.d('Executing ClickHouse aggregate query with pipeline:', pipeline);
        log.d('Options:', options);
        const startTime = Date.now();
        log.d('Executing ClickHouse aggregate query');

        let result;
        try {
            // Extract appId from pipeline.appID first (like query method), then fall back to params.appID
            const appID = pipeline?.appID || (pipeline.params && pipeline.params.appID);
            if (appID) {
                this.maskingService.setAppId(appID.toString());
            }

            const estimatedQuerySize = options?.estimatedQuerySize || 0;
            const needsLargeQuerySettings = estimatedQuerySize > QUERY_SIZE_THRESHOLD;

            // Build effective clickhouse_settings with max_query_size override for large queries
            let effectiveSettings = { ...(options?.clickhouse_settings || {}) };
            if (needsLargeQuerySettings && !effectiveSettings.max_query_size) {
                log.d(`Large query detected (estimatedQuerySize: ${estimatedQuerySize} bytes), applying max_query_size=${LARGE_QUERY_MAX_SIZE}`);
                effectiveSettings.max_query_size = LARGE_QUERY_MAX_SIZE;
            }

            // Attempt to mask query string
            const maskAttempt = this.maskingService.maskQueryString(pipeline.query, pipeline.params);
            const maskedQuery = maskAttempt.masked ? maskAttempt.query : null;
            const queryParams = maskAttempt.masked ? {} : pipeline.params;

            let resultSet;
            let usedMaskedQuery = !!maskedQuery;
            try {
                resultSet = await this.client.query({
                    clickhouse_settings: effectiveSettings,
                    format: options?.progress ? 'JSONEachRowWithProgress' : 'JSONEachRow',
                    query: maskedQuery || pipeline.query,
                    query_params: queryParams
                });
            }
            catch (maskedErr) {
                if (maskedQuery) {
                    log.w('Masked aggregate query failed, falling back to original query and result-level masking', maskedErr);
                    usedMaskedQuery = false;
                    resultSet = await this.client.query({
                        clickhouse_settings: effectiveSettings,
                        format: options?.progress ? 'JSONEachRowWithProgress' : 'JSONEachRow',
                        query: pipeline.query,
                        query_params: pipeline.params
                    });
                }
                else {
                    throw maskedErr;
                }
            }

            /**
             * Process a ClickHouse response object - for options.progress true
             * @param {*} obj - The response object.
             * @param {*} push - The function to call to push processed rows.
             * @returns {Error|null} An error object if processing failed, or null if successful.
             */
            const processProgress = (obj, push) => {
                if (obj?.exception) {
                    const err = new Error(obj.exception?.message || 'An exception occurred during progress handling');
                    return err;
                }
                if (isProgressRow(obj)) {
                    try {
                        options?.onProgress?.(obj.progress);
                    }
                    catch (cbErr) {
                        log.e('onProgress failed', cbErr);
                    }
                    return null;
                }
                if (obj?.row) {
                    push(obj.row);
                    return null;
                }
                if (obj?.meta || obj?.totals || obj?.extremes || obj?.statistics) {
                    return null;
                }
                push(obj);
                return null;
            };

            if (options?.stream) {
                const src = resultSet.stream();
                const maskingService = this.maskingService;
                const shouldMaskResults = !usedMaskedQuery;
                const transformStream = new Transform({
                    objectMode: true,
                    transform(chunk, encoding, callback) {
                        try {
                            const arr = Array.isArray(chunk) ? chunk : [chunk];
                            for (const row of arr) {
                                const obj = row?.json ? row.json() : row;

                                // Apply result masking if query masking didn't work
                                let dataToPush = obj;
                                if (shouldMaskResults && obj && typeof obj === 'object' && obj.row) {
                                    // If it's wrapped in a row object
                                    const maskedRow = maskingService.maskResults([obj.row], pipeline.query);
                                    dataToPush = { ...obj, row: maskedRow[0] };
                                }
                                else if (shouldMaskResults && obj && typeof obj === 'object') {
                                    // If it's a direct row object
                                    const maskedRows = maskingService.maskResults([obj], pipeline.query);
                                    dataToPush = maskedRows[0];
                                }

                                const err = processProgress(dataToPush, (r) => this.push(r));
                                if (err) {
                                    return callback(err);
                                }
                            }
                            callback();
                        }
                        catch (e) {
                            callback(e);
                        }
                    }
                });

                src.on('error', (err) => transformStream.destroy(err));

                transformStream.once('end', () => {
                    const duration = Date.now() - startTime;
                    log.d(`ClickHouse aggregate stream completed in ${duration}ms`);
                });
                transformStream.once('error', (err) => {
                    const duration = Date.now() - startTime;
                    log.e(`ClickHouse aggregate stream failed after ${duration}ms`, err);
                });

                return src.pipe(transformStream);
            }

            if (options?.progress) {
                const src = resultSet.stream();
                const rows = [];

                for await (const chunk of src) {
                    const arr = Array.isArray(chunk) ? chunk : [chunk];
                    for (const part of arr) {
                        const obj = part?.json ? part.json() : part;
                        const err = processProgress(obj, (r) => rows.push(r));
                        if (err) {
                            throw err;
                        }
                    }
                }
                // Mask results if query string masking failed or we fell back
                const maskedResult = usedMaskedQuery ? rows : this.maskingService.maskResults(rows, pipeline.query);
                return maskedResult;
            }

            result = await resultSet.json();
            const duration = Date.now() - startTime;
            log.d(`ClickHouse aggregate query completed in ${duration}ms`);

            // Mask results if query string masking failed or we fell back
            const maskedResult = usedMaskedQuery ? result : this.maskingService.maskResults(result, pipeline.query);
            return maskedResult;

        }
        catch (e) {
            const duration = Date.now() - startTime;
            log.e(`ClickHouse aggregate query failed after ${duration}ms`, e);
            throw e;
        }
    }

    /**
     * Execute a raw ClickHouse mutation using the command API.
     *
     * WARNING: This method is NOT cluster-aware. In cluster mode:
     * - You must manually target _local tables (e.g., drill_events_local)
     * - You must add ON CLUSTER clause for cluster-wide mutations
     * - Consider using executeClusterMutation() for automatic handling
     *
     * @param {(string|Object)} queryObj - SQL string or an object with query and params
     * @param {string} [queryObj.query] - SQL text
     * @param {Object<string, *>} [queryObj.params] - Bound parameters
     * @returns {Promise<boolean>} Resolves to true if mutation succeeds
     *
     * @example
     * // Single node usage:
     * await common.clickhouseQueryService.executeMutation({
     *     query: 'DELETE FROM drill_events WHERE a = {app:String}',
     *     params: { app: 'myapp' }
     * });
     *
     * @example
     * // Cluster mode - manual handling required:
     * // DELETE FROM drill_events_local ON CLUSTER countly_cluster WHERE ...
     */
    async executeMutation(queryObj) {
        const { query, params } = queryObj || {};
        if (!query || typeof query !== 'string') {
            throw new Error('executeMutation: invalid query parameter');
        }

        const startTime = Date.now();
        try {
            await this.client.command({
                query,
                query_params: params
            });
            const duration = Date.now() - startTime;
            log.d(`ClickHouse mutation completed in ${duration}ms`);
            return true;
        }
        catch (e) {
            const duration = Date.now() - startTime;
            log.e(`ClickHouse mutation failed after ${duration}ms`, e);
            throw e;
        }
    }

    /**
     * Execute a cluster-aware mutation that automatically handles table naming
     * and ON CLUSTER clauses based on cluster configuration.
     *
     * In cluster mode:
     * - Automatically targets _local tables
     * - Automatically adds ON CLUSTER clause
     *
     * @param {Object} options - Mutation options
     * @param {string} options.operation - SQL operation (DELETE FROM, ALTER TABLE, etc.)
     * @param {string} options.table - Base table name (e.g., 'drill_events')
     * @param {string} options.whereClause - WHERE clause without the WHERE keyword
     * @param {Object} [options.params] - Query parameters
     * @returns {Promise<boolean>} True on success
     * @throws {Error} If mutation fails
     *
     * @example
     * // Works in both single-node and cluster mode:
     * await common.clickhouseQueryService.executeClusterMutation({
     *     operation: 'DELETE FROM',
     *     table: 'drill_events',
     *     whereClause: 'a = {app:String}',
     *     params: { app: 'myapp' }
     * });
     */
    async executeClusterMutation({ operation, table, whereClause, params = {} }) {
        const countlyConfig = require('../../../api/config');
        const ClusterManager = require('./managers/ClusterManager');
        const cm = new ClusterManager(countlyConfig.clickhouse || {});

        // In cluster mode, target local tables with ON CLUSTER
        const targetTable = cm.isClusterMode() ? `${table}_local` : table;
        const onCluster = cm.isClusterMode() ? ` ${cm.getOnClusterClause()}` : '';

        const query = `${operation} ${targetTable}${onCluster} WHERE ${whereClause}`;

        return this.executeMutation({ query, params });
    }

    /**
     * Insert one or multiple documents into a ClickHouse table.
     * Respects cluster mode and writeThrough configuration.
     *
     * @param {any|any[]} docs - Document or array of documents to insert.
     * @param {Object} [options] - Insert options.
     * @param {string} options.table - Target table name (required).
     * @param {string} [options.database] - Database name (optional, uses table as-is if not provided).
     * @param {string} [options.format='JSONEachRow'] - Insert format.
     * @returns {Promise<void>} Resolves when insert completes.
     */
    async insert(docs, options = {}) {
        if (!options.table) {
            throw new Error('insert: table name is required in options');
        }

        const docsArray = Array.isArray(docs) ? docs : [docs];
        if (docsArray.length === 0) {
            log.d('insert: no documents to insert, skipping');
            return;
        }

        // Get cluster-aware table name based on writeThrough setting
        const targetTable = QueryHelpers.resolveTable(options.table, { forInsert: true });

        const format = options.format || 'JSONEachRow';
        const startTime = Date.now();

        try {
            await this.client.insert({
                table: targetTable,
                values: docsArray,
                format: format
            });

            const duration = Date.now() - startTime;
            log.d(`ClickHouse insert completed: ${docsArray.length} docs to ${targetTable} in ${duration}ms`);
        }
        catch (e) {
            const duration = Date.now() - startTime;
            log.e(`ClickHouse insert failed after ${duration}ms`, { table: targetTable, docCount: docsArray.length, error: e.message });
            throw e;
        }
    }

    /**
     * Get the appropriate table name for INSERT operations.
     * Helper method that wraps QueryHelpers.resolveTable for insert operations.
     *
     * @param {string} table - Base table name (e.g., 'drill_events', 'uid_map')
     * @returns {string} Table name to use for INSERT operations
     */
    getInsertTable(table) {
        return QueryHelpers.resolveTable(table, { forInsert: true });
    }

    /**
     * Update events matching a filter.
     * @param {Filter} filter - Filter criteria.
     * @param {Record<string, any>} update - Update operations.
     * @param {UpdateOptions} [options] - Optional update options.
     * @returns {Promise<void>} Resolves when update completes.
     */
    async update(filter, update, options) {
        // TODO: implement
        log.d("Executing 'update' method (not implemented)", { filter, update, options });
    }

    /**
     * Remove events matching a filter.
     * @param {Filter} filter - Filter criteria.
     * @param {UpdateOptions} [options] - Optional remove options.
     * @returns {Promise<void>} Resolves when remove completes.
     */
    async remove(filter, options) {
        // TODO: implement
        log.d("Executing 'remove' method (not implemented)", { filter, options });
    }

    /**
     * Create an index for query performance.
     * @param {IndexKeys} keys - Fields to index.
     * @param {IndexOptions} [options] - Optional index options.
     * @returns {Promise<string>} Resolves to the created index name.
     */
    async createIndex(keys, options) {
        // TODO: implement
        log.d("Executing 'createIndex' method (not implemented)", { keys, options });
    }

    /**
     * Drop the underlying events table or view.
     * @returns {Promise<void>} Resolves when drop completes.
     */
    async dropCollection() {
        // TODO: implement
        log.d("Executing 'dropCollection' method (not implemented)");
    }

    /**
     * List all databases 
     * @returns {Promise<Array<{name:String}>>} Resolves to an array of database names
     */
    async listDatabases() {
        const sql = "SELECT name FROM system.databases WHERE name LIKE '%countly%' ORDER BY name";
        return this.query({ query: sql });
    }

    /**
     * List all table names for given database
     * @param {String} database - database name
     * @returns {Promise<Array<{name:String}>>} Resolves to an array of collection names
     */
    async listCollections(database) {
        const sql = 'SELECT name FROM system.tables WHERE database = {db:String} ORDER BY name';
        const queryObj = {
            query: sql,
            params: { db: database }
        };
        return this.query(queryObj);
    }
}

module.exports = ClickhouseQueryService;