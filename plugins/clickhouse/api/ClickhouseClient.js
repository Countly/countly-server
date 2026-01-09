const {createClient} = require('@clickhouse/client');
const countlyConfig = require('../../../api/config');
const log = require('../../../api/utils/log.js')('clickhouse:client');
const { URL } = require('url');
const ClusterManager = require('./managers/ClusterManager');

let _undiciInstrRegistered = false;

/**
 * Initializes OpenTelemetry (OTel) if enabled via config or environment variable.
 * @param {Object} telemetryCfg - Telemetry configuration object.
 * @returns {{enabled: boolean, startActiveSpan: (function(*, *, *): Promise<unknown>), inject: (function(*): void), SpanStatusCode: ({ERROR: number}|*)}|{enabled: boolean, startActiveSpan: (function(*, *, *): Promise<*>), inject: *, SpanStatusCode: {ERROR: number}}}  - OTel API or no-op stubs.
 */
function initOtel(telemetryCfg = {}) {
    const enabledFromConfig = !!telemetryCfg.enabled;
    const enabledFromEnv = /^(1|true|yes)$/i.test(process.env.OTEL_ENABLED || '');
    const enabled = enabledFromConfig || enabledFromEnv;

    let api = null;
    if (enabled) {
        try {
            api = require('@opentelemetry/api');
        }
        catch {
            log.d('[OTel] OpenTelemetry API not found, telemetry disabled');
        }
    }

    // Try to register Undici instrumentation (only once, only if API + packages exist)
    if (enabled && api && !_undiciInstrRegistered) {
        try {
            const { registerInstrumentations } = require('@opentelemetry/instrumentation');
            const { UndiciInstrumentation } = require('@opentelemetry/instrumentation-undici');

            registerInstrumentations({
                instrumentations: [
                    new UndiciInstrumentation({
                        requireParentSpan: true,
                    }),
                ],
            });
            _undiciInstrRegistered = true;
            log.d('[OTel] Undici instrumentation registered');
        }
        catch (err) {
            if (err.code === 'MODULE_NOT_FOUND') {
                log.d('[OTel] Undici instrumentation packages not found, skipping');
            }
            else {
                log.w('[OTel] Failed to register Undici instrumentation:', err.message);
            }
        }
    }

    if (!api) {
        // No-op helpers
        return {
            enabled: false,
            startActiveSpan: async(_name, _attrs, fn) =>
                fn({ end() {}, setAttribute() {}, setAttributes() {}, recordException() {}, setStatus() {} }),
            inject: () => {},
            SpanStatusCode: { ERROR: 2 },
        };
    }

    const tracer = api.trace.getTracer(telemetryCfg.serviceName || 'countly-clickhouse-client');
    /**
     * Injects the current trace context into the provided headers object.
     * @param {Object} headers - The headers object to inject the trace context into.
     * @return {void}
     */
    const inject = (headers) => api.propagation.inject(api.context.active(), headers);

    /**
     * Starts an active span with the given name and attributes, executes the provided function within that span,
     * @param {string} name - The name of the span.
     * @param {Object} attributes - Attributes to set on the span.
     * @param {function} fn - The function to execute within the span context. Receives the span as an argument.
     * @returns {Promise<*>} - Resolves with the result of the function or rejects if an error occurs.
     */
    const startActiveSpan = (name, attributes, fn) =>
        new Promise((resolve, reject) => {
            tracer.startActiveSpan(name, { attributes }, async(span) => {
                try {
                    const res = await fn(span);
                    span.end();
                    resolve(res);
                }
                catch (err) {
                    span.recordException(err);
                    span.setStatus({ code: api.SpanStatusCode.ERROR, message: err?.message });
                    span.end();
                    reject(err);
                }
            });
        });

    return {
        enabled: true,
        startActiveSpan,
        inject,
        SpanStatusCode: api.SpanStatusCode,
    };
}

/**
 * Singleton ClickHouse client manager.
 * Ensures only one ClickHouse client instance exists throughout the application lifecycle.
 */
class ClickHouseClientSingleton {
    /**
     * Creates a new ClickHouseClientSingleton instance.
     */
    constructor() {
        this._instance = null;
        this._otel = null;
    }

    /**
     * Gets the singleton ClickHouse client instance.
     * Creates the instance on first access (lazy initialization).
     * @returns {@clickhouse/client.ClickHouseClient} - The ClickHouse client instance.
     * @throws {Error} If the ClickHouse configuration is invalid or missing.
     */
    async getInstance() {
        if (!this._instance) {
            log.d('Creating new ClickHouse client instance');

            // First, ensure the database exists by connecting to 'default' database
            await this._ensureDatabase();

            // Now create the client with the target database
            this._instance = this._createClient();

            // Check connection only on initial creation
            const connected = await this.isConnected();
            if (!connected) {
                log.e('ClickHouse database is not connected or accessible');
                this._instance = null; // Reset instance on connection failure
                throw new Error('ClickHouse database is not connected or accessible');
            }
            log.d('ClickHouse client instance created and connected');
        }

        return this._instance;
    }

    /**
     * Ensures the target database exists by connecting to default database first.
     * In cluster mode, uses ON CLUSTER clause to create database on all nodes.
     * @private
     */
    async _ensureDatabase() {
        const clickhouseConfig = countlyConfig.clickhouse || {};
        const targetDatabase = clickhouseConfig.database || "countly_drill";

        // Check cluster mode to determine if ON CLUSTER is needed
        const cm = new ClusterManager(clickhouseConfig);
        const onCluster = cm.isClusterMode() && !cm.isCloudMode()
            ? ` ${cm.getOnClusterClause()}`
            : '';

        // Create a temporary client connected to 'default' database
        const tempClient = createClient({
            url: clickhouseConfig.url || "http://localhost:8123",
            username: clickhouseConfig.username || "default",
            password: clickhouseConfig.password || "",
            database: "default", // Connect to default database first
            request_timeout: 5000, // Short timeout for DB creation
            application: "countly_drill_setup"
        });

        const query = `CREATE DATABASE IF NOT EXISTS ${targetDatabase}${onCluster}`;

        try {
            // Create the target database if it doesn't exist
            await tempClient.exec({ query });
            log.d(`Ensured database ${targetDatabase} exists${onCluster ? ' (cluster-wide)' : ''}`);
        }
        catch (error) {
            // If exec fails, try with command
            try {
                await tempClient.command({ query });
                log.d(`Ensured database ${targetDatabase} exists (via command)${onCluster ? ' (cluster-wide)' : ''}`);
            }
            catch (cmdError) {
                log.w(`Could not create database ${targetDatabase}, assuming it exists:`, cmdError.message);
            }
        }
        finally {
            // Close the temporary client
            await tempClient.close();
        }
    }

    /**
     * Creates a new ClickHouse client using the configuration from Countly.
     * @private
     * @returns {@clickhouse/client.ClickHouseClient} - The ClickHouse client instance.
     * @throws {Error} If the ClickHouse configuration is invalid or missing.
     */
    _createClient() {
        // Get ClickHouse configuration with defaults
        const clickhouseConfig = countlyConfig.clickhouse || {};

        // Initialize ClusterManager for cluster-related settings
        this._clusterManager = new ClusterManager(clickhouseConfig);

        // --- Optional OTel (and Undici instrumentation, if available) ---
        this._otel = initOtel(clickhouseConfig.telemetry || {});

        log.d('Creating ClickHouse client with config:', {
            url: clickhouseConfig.url,
            database: clickhouseConfig.database,
            username: clickhouseConfig.username,
            clusterMode: this._clusterManager.isClusterMode(),
            cloudMode: this._clusterManager.isCloudMode()
        });

        // Build base clickhouse_settings
        const baseSettings = clickhouseConfig.clickhouse_settings || {};

        // Get cluster-related settings from ClusterManager
        const clusterSettings = this._clusterManager.getAllClusterSettings();

        // Merge all settings: defaults < base < cluster
        const mergedSettings = {
            // Default settings (used when not provided in config)
            ...this._getDefaultSettings(this._clusterManager.isCloudMode()),
            // User-provided settings from config
            ...baseSettings,
            // Cluster-related settings (parallel replicas, distributed, etc.)
            ...clusterSettings
        };

        const client = createClient({
            url: clickhouseConfig.url || "http://localhost:8123",
            username: clickhouseConfig.username || "default",
            password: clickhouseConfig.password || "",
            database: clickhouseConfig.database || "countly_drill",
            compression: clickhouseConfig.compression || {
                request: false,
                response: false,
            },
            application: clickhouseConfig.application || "countly_drill",
            request_timeout: clickhouseConfig.request_timeout || 300_000, // Reduce to 5 minutes
            keep_alive: clickhouseConfig.keep_alive || {
                enabled: true,
                idle_socket_ttl: 30000, // 30 seconds for better connection reuse
                socket_ttl: 300000, // 5 minutes total socket lifetime
            },
            session_timeout: clickhouseConfig.session_timeout || 300_000,
            max_open_connections: clickhouseConfig.max_open_connections || 20,
            clickhouse_settings: mergedSettings
        });

        // Install wrappers
        this._installInstrumentationWrappers(client);

        return client;
    }

    /**
     * Gets the default ClickHouse settings
     * @private
     * @param {boolean} isCloudMode - Whether running in ClickHouse Cloud mode
     * @returns {Object} Default settings
     */
    _getDefaultSettings(isCloudMode = false) {
        const settings = {
            // Experimental JSON/dynamic type settings (required for JSON columns)
            allow_experimental_dynamic_type: 1,
            allow_experimental_json_type: 1,
            enable_json_type: 1,

            // Connection and timeout settings for high throughput
            idle_connection_timeout: 11000 + '',
            connect_timeout: 10000 + '',
            receive_timeout: 300000 + '', // 5 minutes for large queries
            send_timeout: 300000 + '', // 5 minutes for large inserts

            // Async insert optimization for high throughput
            async_insert: 1,
            wait_for_async_insert: 1, // Wait for async insert to be flushed before returning (data durability)
            wait_end_of_query: 1, // Wait for query to complete before returning result
            async_insert_max_data_size: 200000000 + '', // 200MB
            async_insert_busy_timeout_ms: 60000 + '', // 60 seconds
            async_insert_stale_timeout_ms: 60000 + '', // 1 minute

            // Insert and merge optimization
            optimize_on_insert: 1,
            max_insert_block_size: 1000000 + '', // 1M rows
            min_insert_block_size_rows: 1000000 + '',
            min_insert_block_size_bytes: 268435456 + '', // 256MB

            // Query optimization
            allow_suspicious_types_in_group_by: 1,
            allow_suspicious_types_in_order_by: 1,
            optimize_move_to_prewhere: 1,
            query_plan_optimize_lazy_materialization: 1,
            max_threads: 0 + '', // Use all available cores

            // Per-query resource limits
            max_memory_usage: 0 + '', // 0 = use server default (per-query memory limit)
            max_temporary_data_on_disk_size_for_query: 0 + '', // 0 = unlimited temp disk per query

            // Network and compression settings
            network_compression_method: 'lz4',

            // Production stability settings
            send_logs_level: 'error', // Only log errors to reduce overhead
            enable_optimize_predicate_expression: 1,
            enable_optimize_predicate_expression_to_final_subquery: 1,
            optimize_skip_unused_shards: 1
        };

        // These settings are restricted in ClickHouse Cloud
        if (!isCloudMode) {
            settings.log_queries = 0; // Disable query logging for performance
            settings.log_query_threads = 0;
        }

        return settings;
    }

    /**
     * Gets the ClusterManager instance
     * @returns {ClusterManager} ClusterManager instance
     */
    getClusterManager() {
        return this._clusterManager;
    }

    /**
     * Wrap client methods to:
     * 1) start/finish OTel spans
     * 2) inject W3C trace headers
     * 3) capture x-clickhouse-summary and attach to result + span
     * @param {@clickhouse/client.ClickHouseClient} client - The ClickHouse client instance.
     */
    _installInstrumentationWrappers(client) {
        const chCfg = countlyConfig.clickhouse || {};
        const baseUrl = chCfg.url || 'http://localhost:8123';
        let serverAddr = 'localhost';
        let serverPort = 8123;
        try {
            const parsed = new URL(baseUrl);
            serverAddr = parsed.hostname;
            serverPort = Number(parsed.port || (parsed.protocol === 'https:' ? 443 : 8123));
        }
        catch {
            // ignore
        }

        // Default true; you can disable later via config: clickhouse.telemetry.captureQueryText = false
        const captureQueryText =
            (chCfg.telemetry && 'captureQueryText' in chCfg.telemetry)
                ? !!chCfg.telemetry.captureQueryText
                : true;

        const dbName = chCfg.database || 'countly_drill';
        const dbUser = chCfg.username || 'default';

        for (const method of ['query', 'insert', 'exec', 'command']) {
            const original = client[method].bind(client);

            client[method] = async(params = {}) => {
                const startNs = process.hrtime.bigint();

                const attributes = {
                    'db.system': 'clickhouse',
                    'db.name': dbName,
                    'db.user': dbUser,
                    'db.operation': method,
                    'server.address': serverAddr,
                    'server.port': serverPort,
                    'net.transport': 'ip_tcp',
                    'network.protocol.name': 'http',
                    'network.protocol.version': baseUrl.startsWith('https:') ? '1.1+TLS' : '1.1',
                    ...(captureQueryText && params.query ? {
                        'db.statement': String(params.query).slice(0, 2048),
                        'db.statement.truncated': String(params.query).length > 2048
                    } : {}),
                };

                /**
                 * Performs the actual ClickHouse call with injected headers and captures summary if present.
                 * @param {Object} span - The OpenTelemetry span to annotate (can be null).
                 * @return {Promise<*>} - Resolves with the result of the ClickHouse call.
                 */
                const doCall = async(span) => {
                    // Merge headers and inject trace context
                    const headers = Object.assign({}, chCfg.http_headers || {}, params.http_headers || {});
                    this._otel.inject(headers);

                    // Execute call
                    const result = await original({ ...params, http_headers: headers });

                    // Capture x-clickhouse-summary if present
                    const rsHeaders = result && result.response_headers ? result.response_headers : {};
                    const summaryRaw = rsHeaders && (rsHeaders['x-clickhouse-summary'] || rsHeaders['X-ClickHouse-Summary']);
                    if (summaryRaw) {
                        let summary = null;
                        try {
                            summary = JSON.parse(summaryRaw);
                        }
                        catch {
                            summary = { _raw: String(summaryRaw) };
                        }
                        try {
                            Object.defineProperty(result, 'summary', {
                                value: summary, enumerable: false, configurable: true, writable: false,
                            });
                        }
                        catch {
                            result.summary = summary;
                        }
                        if (span && summary) {
                            /**
                             * Converts a value to a number or undefined if null/undefined/NaN.
                             * @param {*} v - The value to convert.
                             * @returns {number|undefined} - The converted number or undefined.
                             */
                            const toNum = (v) => {
                                if (v === null || v === undefined) {
                                    return undefined;
                                }
                                const num = Number(v);
                                return isNaN(num) ? undefined : num;
                            };
                            span.setAttributes({
                                'clickhouse.read_rows': toNum(summary.read_rows),
                                'clickhouse.read_bytes': toNum(summary.read_bytes),
                                'clickhouse.written_rows': toNum(summary.written_rows),
                                'clickhouse.written_bytes': toNum(summary.written_bytes),
                                'clickhouse.total_rows_to_read': toNum(summary.total_rows_to_read),
                                'clickhouse.result_rows': toNum(summary.result_rows),
                                'clickhouse.result_bytes': toNum(summary.result_bytes),
                                'clickhouse.elapsed_ns': toNum(summary.elapsed_ns),
                            });
                        }
                    }

                    // Client-observed duration (covers wait + transfer)
                    const elapsedNs = Number(process.hrtime.bigint() - startNs);
                    if (span) {
                        span.setAttributes({ 'db.response.client_elapsed_ns': elapsedNs });
                    }

                    if (span && result && result.query_id) {
                        span.setAttribute('clickhouse.query_id', result.query_id);
                    }

                    return result;
                };

                if (!this._otel.enabled) {
                    return doCall(null);
                }
                return this._otel.startActiveSpan(`ClickHouse.${method}`, attributes, doCall);
            };
        }
    }

    /**
     * Resets the singleton instance (useful for testing or configuration changes).
     * @returns {void}
     */
    reset() {
        if (this._instance) {
            // Close existing connection if the client has a close method
            if (typeof this._instance.close === 'function') {
                this._instance.close();
            }
            this._instance = null;
        }
    }

    /**
     * Checks if the singleton instance has been created.
     * @returns {boolean} - True if instance exists, false otherwise.
     */
    hasInstance() {
        return this._instance !== null;
    }

    /**
     * Checks if the ClickHouse database is connected and accessible.
     * @returns {Promise<boolean>} - True if connected, false otherwise.
     */
    async isConnected() {
        if (!this._instance) {
            return false;
        }

        try {
            const pingResult = await this._instance.ping();

            if (pingResult.success) {
                log.d('ClickHouse connection test successful');
                return true;
            }
            else {
                log.e('ClickHouse connection test failed:', pingResult.error.message);
                return false;
            }
        }
        catch (error) {
            log.e('ClickHouse connection test error:', error);
            return false;
        }
    }
}

// Create the singleton instance
const clickHouseClientSingleton = new ClickHouseClientSingleton();

// Export the singleton manager for advanced use cases
module.exports = clickHouseClientSingleton;