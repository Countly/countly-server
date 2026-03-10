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
const {performance, monitorEventLoopDelay} = require('perf_hooks');
const sharedMetrics = require('./metrics');

let meter;
let applicationMetrics;
let httpMetrics;
let serverDurationMetric;

// Track previous CPU usage for delta calculation
let previousCpuUsage = process.cpuUsage();

const getMetricAttributes = sharedMetrics.getMetricAttributes;

/**
 * Create HTTP metrics
 * @param {object} meterInstance - Meter instance
 * @returns {object} HTTP metrics object
 */
const createHttpMetrics = (meterInstance) => ({
    requestTotal: meterInstance.createCounter('http.request.total', {
        description: 'Total number of HTTP requests',
    }),
    requestDuration: meterInstance.createHistogram('http.request.duration', {
        description: 'Duration of HTTP requests',
        unit: 'ms',
    }),
    requestInFlight: meterInstance.createUpDownCounter('http.request.in_flight', {
        description: 'Number of HTTP requests currently in flight',
    }),
    responseStatusTotal: meterInstance.createCounter('http.response.status_total', {
        description: 'Total number of HTTP responses by status code',
    }),
    errorTotal: meterInstance.createCounter('http.error.total', {
        description: 'Total number of HTTP errors',
    }),
});

/**
 * Create server duration metric
 * @param {object} meterInstance - Meter instance
 * @returns {object} Server duration metric
 */
const createServerDurationMetric = (meterInstance) => meterInstance.createHistogram('countly_http_server_duration_milliseconds', {
    description: 'Measures the duration of inbound HTTP requests.',
    unit: 'ms',
});

const createApplicationMetrics = sharedMetrics.createApplicationMetrics;

const getBaseAttributes = sharedMetrics.getBaseAttributes;

// Track previous ELU for calculating utilization
let previousELU = performance.eventLoopUtilization();

// Track previous memory values for UpDownCounter
// Memory tracking state was previously stored here but is now initialized inline
// when needed within the SDK startup process

const _metricsState = { previousCpuUsage, previousELU };
// eslint-disable-next-line require-jsdoc
const collectSystemMetrics = () => sharedMetrics.collectSystemMetrics(applicationMetrics, getBaseAttributes, _metricsState);

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
// eslint-disable-next-line no-unused-vars
let sdkInitialized = false;
let _resolveSdkReady, _rejectSdkReady;
const sdkReady = new Promise((resolve, reject) => {
    _resolveSdkReady = resolve;
    _rejectSdkReady = reject;
});
sdkReady.catch(() => {}); // prevent unhandled rejection when OTel disabled
let sdkInstance = null;

/**
 * Initialize OpenTelemetry
 * @returns {void}
 */
function initializeOpenTelemetry() {
    if (process.env.OTEL_ENABLED !== 'true') {
        console.log('[OTEL-EXPRESS] OpenTelemetry is disabled (OTEL_ENABLED !== true)');
        _rejectSdkReady(new Error('OpenTelemetry disabled'));
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

                        // Record HTTP metrics (low-cardinality labels only)
                        if (httpMetrics) {
                            const metricAttrs = getMetricAttributes(request);
                            const startTime = Date.now();
                            httpMetrics.requestInFlight.add(1, metricAttrs);
                            httpMetrics.requestTotal.add(1, metricAttrs);

                            request.on('response', (response) => {
                                try {
                                    const responseTime = Date.now();
                                    const responseAttrs = getMetricAttributes(request, response);
                                    httpMetrics.responseStatusTotal.add(1, responseAttrs);
                                    if (serverDurationMetric) {
                                        serverDurationMetric.record(responseTime - startTime, responseAttrs);
                                    }
                                    if (response.statusCode >= 400) {
                                        httpMetrics.errorTotal.add(1, responseAttrs);
                                    }
                                    response.on('end', () => {
                                        try {
                                            const duration = Date.now() - startTime;
                                            httpMetrics.requestDuration.record(duration, responseAttrs);
                                            httpMetrics.requestInFlight.add(-1, metricAttrs);
                                        }
                                        catch (endError) {
                                            console.error('Error recording end metrics:', endError);
                                        }
                                    });
                                }
                                catch (responseError) {
                                    console.error('Error handling response metrics:', responseError);
                                }
                            });

                            request.on('error', (err) => {
                                try {
                                    httpMetrics.errorTotal.add(1, { ...metricAttrs, 'error_type': err.name || 'unknown' });
                                }
                                catch (errorMetricError) {
                                    console.error('Error handling error metrics:', errorMetricError);
                                }
                            });
                        }
                    }
                    catch (error) {
                        console.error('Error in request hook:', error);
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
        const gcObserver = sharedMetrics.setupGCObserver(() => applicationMetrics, getBaseAttributes);

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
                httpMetrics = createHttpMetrics(meter);
                serverDurationMetric = createServerDurationMetric(meter);

                // Initialize previous memory values to current values to avoid huge initial deltas
                // Memory tracking is handled by the ObservableGauges directly
                // const initialMemory = process.memoryUsage();

                const baseAttrs = getBaseAttributes();
                sharedMetrics.createRuntimeObservableGauges(meter, baseAttrs, eventLoopMonitor);

                console.log('[OTEL-EXPRESS] ✅ OpenTelemetry initialized successfully!');
                sdkInitialized = true;
                _resolveSdkReady();
                return Promise.resolve();
            },
            3,
            1000
        ).catch((err) => {
            console.error('[OTEL-EXPRESS] retryWithBackoff exhausted:', err);
            _rejectSdkReady(err);
        });
    }
    catch (error) {
        console.error('[OTEL-EXPRESS] ❌ Failed to initialize OpenTelemetry:', error);
        _rejectSdkReady(error);
        // Don't exit, let the application continue without telemetry
    }
}

// Initialize immediately if enabled
if (process.env.OTEL_ENABLED === 'true') {
    initializeOpenTelemetry();
}

// Export everything needed externally
module.exports = {
    sdkReady,
    errorHandlingStrategies,
};
