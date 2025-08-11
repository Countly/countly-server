/* Early-load MongoDB require.cache check (must be FIRST, before any other require) */
(function() {
    var mongodbLoaded;
    try {
        mongodbLoaded = require.cache[require.resolve('mongodb')];
        if (mongodbLoaded) {
            console.warn('[OTEL-EXPRESS] WARNING: MongoDB driver is already loaded before OpenTelemetry instrumentation!');
            console.warn('[OTEL-EXPRESS] MongoDB operations may not be traced properly.');
        }
        else {
            console.log('[OTEL-EXPRESS] Good: MongoDB driver not yet loaded, instrumentation should work.');
        }
    }
    catch (e) {
        console.log('[OTEL-EXPRESS] MongoDB driver not found in require cache (this is expected).');
    }
})();

const {NodeSDK} = require('@opentelemetry/sdk-node');
const {getNodeAutoInstrumentations} = require('@opentelemetry/auto-instrumentations-node');
// Individual instrumentation imports
const {HttpInstrumentation} = require('@opentelemetry/instrumentation-http');
const {ExpressInstrumentation} = require('@opentelemetry/instrumentation-express');
const {MongoDBInstrumentation} = require('@opentelemetry/instrumentation-mongodb');
const {FsInstrumentation} = require('@opentelemetry/instrumentation-fs');
const {PinoInstrumentation} = require('@opentelemetry/instrumentation-pino');
const {OTLPTraceExporter} = require('@opentelemetry/exporter-trace-otlp-http');
const {OTLPMetricExporter} = require('@opentelemetry/exporter-metrics-otlp-http');
const {PeriodicExportingMetricReader} = require('@opentelemetry/sdk-metrics');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const {SemanticResourceAttributes} = require('@opentelemetry/semantic-conventions');
const {diag, DiagConsoleLogger, DiagLogLevel} = require('@opentelemetry/api');
const {RuntimeNodeInstrumentation} = require('@opentelemetry/instrumentation-runtime-node');
const {CompositePropagator, W3CTraceContextPropagator, W3CBaggagePropagator} = require('@opentelemetry/core');
const {BatchSpanProcessor} = require('@opentelemetry/sdk-trace-base');
const {performance, PerformanceObserver, monitorEventLoopDelay} = require('perf_hooks');

let meter;
let applicationMetrics;

// Track previous CPU usage for delta calculation
let previousCpuUsage = process.cpuUsage();

/**
 * Create application metrics
 * @param {object} meterInstance - Meter instance
 * @returns {object} Application metrics object
 */
const createApplicationMetrics = (meterInstance) => ({
    // System metrics - using create* API
    processCpuUser: meterInstance.createCounter('process.cpu.user', {
        description: 'Process CPU time spent in user mode',
        unit: 'us',
    }),
    processCpuSystem: meterInstance.createCounter('process.cpu.system', {
        description: 'Process CPU time spent in system mode',
        unit: 'us',
    }),
    eventLoopLag: meterInstance.createHistogram('nodejs.eventloop.lag', {
        description: 'Event loop lag',
        unit: 'ms',
    }),
    eventLoopUtilization: meterInstance.createHistogram('nodejs.eventloop.utilization', {
        description: 'Event loop utilization percentage',
        unit: '1',
    }),

    // GC metrics - renamed to avoid conflict with RuntimeNodeInstrumentation (Problem #3 fix)
    gcPauseTime: meterInstance.createHistogram('custom.gc.pause_ns', {
        description: 'Garbage collection pause time',
        unit: 'ns',
    }),
    gcCount: meterInstance.createCounter('custom.gc.count', {
        description: 'Number of garbage collections',
    }),

    // Memory metrics are now created as ObservableGauges to fix zig-zag pattern (Problem #6)
});

/**
 * Get base attributes
 * @returns {object} Base attributes
 */
const getBaseAttributes = () => {
    const attributes = {
        application: 'countly',
        deployment: process.env.DEPLOYMENT_ENV || 'unknown',
        node_version: process.version || 'unknown'
    };

    const serviceVersion = process.env.npm_package_version;
    if (serviceVersion) {
        attributes.service_version = serviceVersion;
    }

    return attributes;
};

// Track previous ELU for calculating utilization
let previousELU = performance.eventLoopUtilization();

// Track previous memory values for UpDownCounter
// Memory tracking state was previously stored here but is now initialized inline
// when needed within the SDK startup process

/**
 * Collect system metrics
 * @returns {void}
 */
const collectSystemMetrics = () => {
    // Skip if metrics not initialized
    if (!applicationMetrics) {
        return;
    }
    try {
        const attributes = getBaseAttributes();

        // CPU metrics - record delta microseconds
        const currentCpuUsage = process.cpuUsage();
        const cpuDiff = process.cpuUsage(previousCpuUsage);

        if (cpuDiff.user) {
            applicationMetrics.processCpuUser.add(cpuDiff.user, attributes);
        }
        if (cpuDiff.system) {
            applicationMetrics.processCpuSystem.add(cpuDiff.system, attributes);
        }

        previousCpuUsage = currentCpuUsage;

        // Event loop utilization (ELU)
        const currentELU = performance.eventLoopUtilization();
        const utilization = performance.eventLoopUtilization(currentELU, previousELU);
        if (utilization.utilization > 0) {
            applicationMetrics.eventLoopUtilization.record(utilization.utilization, attributes);
        }
        previousELU = currentELU;

        // Memory metrics are now collected via ObservableGauges (Problem #6 fix)
    }
    catch (error) {
        console.error('Error collecting system metrics:', error);
    }
};

/**
 * Error handling and recovery strategies
 * @type {object}
 */
const errorHandlingStrategies = {
    /**
     * Retry operation with exponential backoff
     * @param {Function} operation - Operation to retry
     * @param {number} maxAttempts - Maximum attempts
     * @param {number} initialDelay - Initial delay in ms
     * @returns {Promise<any>} Operation result
     */
    retryWithBackoff: async(operation, maxAttempts = 3, initialDelay = 1000) => {
        let attempt = 0;
        while (attempt < maxAttempts) {
            try {
                return await operation();
            }
            catch (error) {
                attempt++;
                if (attempt === maxAttempts) {
                    throw error;
                }
                await new Promise(resolve => setTimeout(resolve, initialDelay * Math.pow(2, attempt - 1)));
            }
        }
    },

    /**
     * Gracefully shutdown SDK
     * @param {object} sdkInstance - SDK instance to shutdown
     * @returns {Promise<void>} Shutdown promise
     */
    gracefulShutdown: async(sdkInstance) => {
        try {
            await sdkInstance.shutdown()
                .catch(error => console.error('Error during OpenTelemetry shutdown:', error));
        }
        catch (error) {
            console.error('Fatal error during shutdown:', error);
            process.exit(1);
        }
    }
};

// Initialize SDK synchronously
let sdkInitialized = false;
let sdkInstance = null;

/**
 * Initialize OpenTelemetry
 * @returns {void}
 */
function initializeOpenTelemetry() {
    if (process.env.OTEL_ENABLED !== 'true') {
        console.log('[OTEL-EXPRESS] OpenTelemetry is disabled (OTEL_ENABLED !== true)');
        return;
    }

    console.log('[OTEL-EXPRESS] Starting synchronous OpenTelemetry initialization...');
    // Enable debug logging if needed
    if (process.env.OTEL_DEBUG === 'true') {
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
    }

    // Enhanced configuration
    const OTEL_CONFIG = {
        ENDPOINT: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318',
        SERVICE_NAME: process.env.OTEL_SERVICE_NAME || 'unknown-service',
        SERVICE_VERSION: process.env.npm_package_version || '0.0.0',
        ENVIRONMENT: process.env.NODE_ENV || 'production',
        METRIC_EXPORT_INTERVAL: parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL_MILLIS || '10000', 10),
        HEADERS: process.env.OTEL_EXPORTER_OTLP_HEADERS ?
            Object.fromEntries(process.env.OTEL_EXPORTER_OTLP_HEADERS.split(',').map(h => h.split('='))) :
            undefined,
        BATCH_TIMEOUT: parseInt(process.env.OTEL_BATCH_TIMEOUT || '5000', 10),
        MAX_QUEUE_SIZE: parseInt(process.env.OTEL_MAX_QUEUE_SIZE || '2048', 10),
        MAX_EXPORT_BATCH_SIZE: parseInt(process.env.OTEL_MAX_EXPORT_BATCH_SIZE || '512', 10),
    };

    try {
        // Create resource with basic attributes synchronously
        const resource = resourceFromAttributes({
            [SemanticResourceAttributes.SERVICE_NAME]: OTEL_CONFIG.SERVICE_NAME,
            [SemanticResourceAttributes.SERVICE_VERSION]: OTEL_CONFIG.SERVICE_VERSION,
            [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: OTEL_CONFIG.ENVIRONMENT,
            'application': 'countly',
        });

        // Configure exporters with enhanced error handling
        const metricExporter = new OTLPMetricExporter({
            url: `${OTEL_CONFIG.ENDPOINT}/v1/metrics`,
            headers: OTEL_CONFIG.HEADERS,
            timeoutMillis: 15000,
            concurrencyLimit: 50,
        });

        const traceExporter = new OTLPTraceExporter({
            url: `${OTEL_CONFIG.ENDPOINT}/v1/traces`,
            headers: OTEL_CONFIG.HEADERS,
            timeoutMillis: 15000,
            concurrencyLimit: 50,
        });

        // Enhanced instrumentations configuration
        const instrumentations = [
            ...getNodeAutoInstrumentations({
                // Disable instrumentations we're configuring separately
                '@opentelemetry/instrumentation-http': {
                    enabled: false,
                },
                '@opentelemetry/instrumentation-express': {
                    enabled: false,
                },
                '@opentelemetry/instrumentation-mongodb': {
                    enabled: false,
                },
                '@opentelemetry/instrumentation-fs': {
                    enabled: false,
                },
                '@opentelemetry/instrumentation-pino': {
                    enabled: false,
                },
                '@opentelemetry/instrumentation-runtime-node': {
                    enabled: false,
                },
            }),
            // Separately configured instrumentations
            new HttpInstrumentation({
                ignoreIncomingPaths: ['/health', '/metrics', '/favicon.ico'],
                requireParentforOutgoingSpans: false,
                requestHook: (span, request) => {
                    try {
                        const traceParent = request?.headers?.traceparent;
                        if (traceParent && typeof traceParent === 'string') {
                            span.setAttribute('nginx.trace_id', traceParent);
                            span.setAttribute('nginx.traceparent', traceParent);
                        }
                    }
                    catch (error) {
                        console.error('Error setting traceparent attributes on span', error);
                    }
                },
            }),
            new ExpressInstrumentation({
                ignoreLayers: [
                    (layerType, request) => {
                        const path = request.url?.split('?')[0] || '';
                        return path === '/health' || path === '/metrics';
                    }
                ],
                recordMiddleware: true,
            }),
            new MongoDBInstrumentation({
                enhancedDatabaseReporting: true,
                requireParentSpan: false,
                requestHook: (span, info) => {
                    // Debug logging for MongoDB operations
                    console.log('[OTEL-EXPRESS] MongoDB operation:', {
                        operation: info.operation,
                        namespace: info.namespace,
                        commandName: info.commandName
                    });
                },
            }),
            new FsInstrumentation({
                enabled: false,
            }),
            new RuntimeNodeInstrumentation({
                monitoringPrecision: 5000,
            }),
            new PinoInstrumentation({
                enabled: true,
                logHook: (span, record) => {
                    try {
                        // Add log level and message to span
                        if (record.level) {
                            span.setAttribute('log.level', record.level);
                        }
                        if (record.msg) {
                            span.setAttribute('log.message', record.msg);
                        }

                        // Handle errors
                        if (record?.err) {
                            span.recordException(record.err);
                            const errorMessage = record.err.message || 'Unknown error';
                            span.setStatus({code: 2, message: errorMessage});
                        }

                        // Add custom fields from log record
                        if (record.reqId) {
                            span.setAttribute('log.request_id', record.reqId);
                        }
                        if (record.userId) {
                            span.setAttribute('log.user_id', record.userId);
                        }
                    }
                    catch (error) {
                        console.error('Error in pino log hook:', error);
                    }
                },
                disableLogCorrelation: false,
            }),
        ];


        // Create metricReader for NodeSDK (Problem #1 fix)
        const metricReader = new PeriodicExportingMetricReader({
            exporter: metricExporter,
            exportIntervalMillis: OTEL_CONFIG.METRIC_EXPORT_INTERVAL,
            exportTimeoutMillis: Math.max(1000, Math.min(5000, OTEL_CONFIG.METRIC_EXPORT_INTERVAL - 100)),
        });

        // Create SDK with enhanced configuration
        sdkInstance = new NodeSDK({
            resource: resource,
            traceExporter: traceExporter,
            metricReader: metricReader,
            instrumentations: instrumentations,
            spanProcessor: new BatchSpanProcessor(traceExporter, {
                maxQueueSize: OTEL_CONFIG.MAX_QUEUE_SIZE,
                maxExportBatchSize: OTEL_CONFIG.MAX_EXPORT_BATCH_SIZE,
                scheduledDelayMillis: OTEL_CONFIG.BATCH_TIMEOUT,
            }),
            propagator: new CompositePropagator({
                propagators: [
                    new W3CTraceContextPropagator(),
                    new W3CBaggagePropagator(),
                ],
            }),
        });

        // Start collecting system metrics
        const metricsInterval = setInterval(collectSystemMetrics, 5000);

        // Setup event loop delay monitoring (Node 18+)
        let eventLoopMonitor;
        let eventLoopInterval;
        try {
            eventLoopMonitor = monitorEventLoopDelay({ resolution: 10 });
            eventLoopMonitor.enable();

            // Record event loop lag into histogram every 5 seconds
            eventLoopInterval = setInterval(() => {
                if (eventLoopMonitor && applicationMetrics) {
                    try {
                        const attributes = getBaseAttributes();

                        // Record current lag values into histogram
                        const meanMs = eventLoopMonitor.mean / 1e6; // Convert ns to ms
                        const maxMs = eventLoopMonitor.max / 1e6;
                        const p99Ms = eventLoopMonitor.percentile(99) / 1e6;

                        // Record multiple samples to represent the distribution
                        if (meanMs > 0) {
                            applicationMetrics.eventLoopLag.record(meanMs, attributes);
                        }
                        if (p99Ms > 0) {
                            applicationMetrics.eventLoopLag.record(p99Ms, attributes);
                        }
                        if (maxMs > 0 && maxMs !== p99Ms) {
                            applicationMetrics.eventLoopLag.record(maxMs, attributes);
                        }

                        // Reset monitor after reading to get fresh data next interval
                        eventLoopMonitor.reset();
                    }
                    catch (error) {
                        console.error('Error recording event loop metrics:', error);
                    }
                }
            }, 5000);

            // Clean up interval on shutdown
            process.on('beforeExit', () => clearInterval(eventLoopInterval));
        }
        catch (error) {
            // Event loop delay monitoring not available (requires Node 18+)
            console.warn('Event loop delay monitoring not available:', error.message);
        }

        // Setup GC metrics collection
        const gcObserver = new PerformanceObserver((list) => {
            // Skip if metrics not initialized
            if (!applicationMetrics) {
                return;
            }

            const attributes = getBaseAttributes();
            const entries = list.getEntries();

            for (const entry of entries) {
                if (entry.kind !== undefined) {
                    // Record GC pause time in nanoseconds (entry.duration is in ms, metric expects ns)
                    applicationMetrics.gcPauseTime.record(entry.duration * 1e6, {
                        ...attributes,
                        'gc.type': getGCType(entry.kind)
                    });

                    // Count GC events by type
                    applicationMetrics.gcCount.add(1, {
                        ...attributes,
                        'gc.type': getGCType(entry.kind)
                    });
                }
            }

            // Flush the buffer to prevent memory leak
            gcObserver.takeRecords();
        });

        /**
         * Get GC type name from kind
         * @param {number} kind - GC kind number
         * @returns {string} GC type name
         */
        const getGCType = (kind) => {
            // GC types: https://nodejs.org/api/perf_hooks.html#performanceentrygckind
            const gcTypes = {
                1: 'scavenge',
                2: 'mark_sweep_compact',
                4: 'incremental_marking',
                8: 'weak_callbacks',
                16: 'all'
            };
            return gcTypes[kind] || 'unknown';
        };

        // Start observing GC events
        try {
            gcObserver.observe({ entryTypes: ['gc'] });
        }
        catch (error) {
            console.error('Failed to setup GC observer:', error);
        }

        /**
         * Handle graceful shutdown
         * @returns {Promise<void>} Shutdown promise
         */
        const shutdownHandler = async() => {
            clearInterval(metricsInterval);
            if (eventLoopInterval) {
                clearInterval(eventLoopInterval);
            }
            gcObserver.disconnect();
            if (eventLoopMonitor) {
                eventLoopMonitor.disable();
            }
            await errorHandlingStrategies.gracefulShutdown(sdkInstance);
        };

        process.on('SIGTERM', shutdownHandler);
        process.on('SIGINT', shutdownHandler);

        // Start the SDK with error handling
        errorHandlingStrategies.retryWithBackoff(
            () => {
                sdkInstance.start();

                // Initialize Pyroscope profiling if enabled
                // Profile Collection Flow: Node.js SDK → Alloy (PROFILE_COLLECTOR_URL) → Pyroscope Backend
                if (process.env.PYROSCOPE_ENABLED === 'true') {
                    try {
                        const Pyroscope = require('@pyroscope/nodejs');

                        Pyroscope.init({
                            serverAddress: process.env.PROFILE_COLLECTOR_URL
                                || 'http://alloy.countly-observability.svc.cluster.local:9999',
                            appName: process.env.OTEL_SERVICE_NAME || 'countly-node',
                            tags: {
                                deployment: process.env.DEPLOYMENT_ENV || 'unknown',
                                service_version: process.env.npm_package_version || '0.0.0',
                                environment: process.env.NODE_ENV || 'production'
                            },
                            wall: { collectCpuTime: true }, // CPU profiling
                            heapSamplingIntervalBytes: 262144, // 256 KiB heap sampling interval
                        });

                        Pyroscope.start();
                        console.log('Pyroscope profiling started successfully');
                    }
                    catch (error) {
                        console.error('Failed to start Pyroscope profiling (this is non-fatal):', error.message);
                        // Don't fail the entire startup if Pyroscope fails
                    }
                }
                else {
                    console.log('Pyroscope profiling is disabled via PYROSCOPE_ENABLED flag.');
                }

                // Now create metrics after SDK is started using global meter
                const { metrics } = require('@opentelemetry/api');
                meter = metrics.getMeter('application-metrics');
                applicationMetrics = createApplicationMetrics(meter);

                // Initialize previous memory values to current values to avoid huge initial deltas
                // Memory tracking is handled by the ObservableGauges directly
                // const initialMemory = process.memoryUsage();

                // Cache base attributes to avoid repeated allocations
                const baseAttrs = getBaseAttributes();

                // Track whether we've read all gauges this cycle
                let gaugesRead = 0;
                /**
                 * Reset event loop monitor after all gauges are read
                 * @returns {void}
                 */
                const resetAfterAllGauges = () => {
                    gaugesRead++;
                    if (gaugesRead >= 3 && eventLoopMonitor) {
                        eventLoopMonitor.reset();
                        gaugesRead = 0;
                    }
                };

                // Create observable gauges with proper callback pattern
                // Create observable gauge for max event loop lag
                meter.createObservableGauge(
                    'nodejs.eventloop.lag.max',
                    {
                        description: 'Maximum event loop lag since last measurement',
                        unit: 'ms',
                    },
                    (result) => {
                        if (eventLoopMonitor) {
                            result.observe(eventLoopMonitor.max / 1e6, baseAttrs);
                            resetAfterAllGauges();
                        }
                    }
                );

                // Create observable gauge for mean event loop lag
                meter.createObservableGauge(
                    'nodejs.eventloop.lag.mean',
                    {
                        description: 'Mean event loop lag',
                        unit: 'ms',
                    },
                    (result) => {
                        if (eventLoopMonitor) {
                            result.observe(eventLoopMonitor.mean / 1e6, baseAttrs);
                            resetAfterAllGauges();
                        }
                    }
                );

                // Create observable gauge for 99th percentile event loop lag
                meter.createObservableGauge(
                    'nodejs.eventloop.lag.p99',
                    {
                        description: '99th percentile event loop lag',
                        unit: 'ms',
                    },
                    (result) => {
                        if (eventLoopMonitor) {
                            const p99 = eventLoopMonitor.percentile(99);
                            result.observe(p99 / 1e6, baseAttrs);
                            resetAfterAllGauges();
                        }
                    }
                );

                // Add missing event loop utilization ratio gauge
                // Create observable gauge for event loop utilization ratio
                meter.createObservableGauge(
                    'nodejs.eventloop.utilization.ratio',
                    {
                        description: 'Event loop utilization as a ratio (0-1)',
                        unit: '1',
                    },
                    (result) => {
                        try {
                            const currentELU = performance.eventLoopUtilization();
                            const utilization = performance.eventLoopUtilization(currentELU, previousELU);
                            if (utilization.utilization >= 0) {
                                result.observe(utilization.utilization, baseAttrs);
                            }
                            previousELU = currentELU;
                        }
                        catch (error) {
                            console.error('Error collecting event loop utilization:', error);
                        }
                    }
                );

                // Memory metrics as ObservableGauges (Problem #6 fix)
                // Create observable gauge for RSS memory
                meter.createObservableGauge('process.memory.usage', {
                    description: 'Process memory usage (RSS)',
                    unit: 'bytes',
                }, (result) => {
                    result.observe(process.memoryUsage().rss, baseAttrs);
                });

                // Create observable gauge for heap used memory
                meter.createObservableGauge('process.memory.heap.used', {
                    description: 'Process heap used memory',
                    unit: 'bytes',
                }, (result) => {
                    result.observe(process.memoryUsage().heapUsed, baseAttrs);
                });

                // Create observable gauge for heap total memory
                meter.createObservableGauge('process.memory.heap.total', {
                    description: 'Process heap total memory',
                    unit: 'bytes',
                }, (result) => {
                    result.observe(process.memoryUsage().heapTotal, baseAttrs);
                });

                // Create observable gauge for external memory
                meter.createObservableGauge('process.memory.external', {
                    description: 'Process external memory usage',
                    unit: 'bytes',
                }, (result) => {
                    result.observe(process.memoryUsage().external, baseAttrs);
                });

                console.log('[OTEL-EXPRESS] ✅ OpenTelemetry initialized successfully!');
                sdkInitialized = true;
                return Promise.resolve();
            },
            3,
            1000
        );
    }
    catch (error) {
        console.error('[OTEL-EXPRESS] ❌ Failed to initialize OpenTelemetry:', error);
        // Don't exit, let the application continue without telemetry
    }
}

// Initialize immediately if enabled
if (process.env.OTEL_ENABLED === 'true') {
    initializeOpenTelemetry();
}

// Create SDK ready promise
const sdkReady = sdkInitialized ? Promise.resolve() : Promise.reject(new Error('OpenTelemetry not initialized'));

// Export everything needed externally
module.exports = {
    sdkReady,
    errorHandlingStrategies,
};
