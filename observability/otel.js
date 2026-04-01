/* Early-load MongoDB require.cache check (must be FIRST, before any other require) */
(function() {
    var mongodbLoaded;
    try {
        mongodbLoaded = require.cache[require.resolve('mongodb')];
        if (mongodbLoaded) {
            console.warn('[OTEL] WARNING: MongoDB driver is already loaded before OpenTelemetry instrumentation!');
            console.warn('[OTEL] MongoDB operations may not be traced properly.');
        }
        else {
            console.log('[OTEL] Good: MongoDB driver not yet loaded, instrumentation should work.');
        }
    }
    catch (e) {
        console.log('[OTEL] MongoDB driver not found in require cache (this is expected).');
    }
})();

const {NodeSDK} = require('@opentelemetry/sdk-node');
const {getNodeAutoInstrumentations} = require('@opentelemetry/auto-instrumentations-node');

// Early-load MongoDB require.cache check (must be before any code that could load mongodb)
var mongodbLoaded;
try {
    mongodbLoaded = require.cache[require.resolve('mongodb')];
    if (mongodbLoaded) {
        console.warn('[OTEL] WARNING: MongoDB driver is already loaded before OpenTelemetry instrumentation!');
        console.warn('[OTEL] MongoDB operations may not be traced properly.');
    }
    else {
        console.log('[OTEL] Good: MongoDB driver not yet loaded, instrumentation should work.');
    }
}
catch (e) {
    console.log('[OTEL] MongoDB driver not found in require cache (this is expected).');
}
// Individual instrumentation imports for type checking
const {HttpInstrumentation} = require('@opentelemetry/instrumentation-http');
const {ExpressInstrumentation} = require('@opentelemetry/instrumentation-express');
const {MongoDBInstrumentation} = require('@opentelemetry/instrumentation-mongodb');
const {FsInstrumentation} = require('@opentelemetry/instrumentation-fs');
const {PinoInstrumentation} = require('@opentelemetry/instrumentation-pino');
const {KafkaJsInstrumentation} = require('@opentelemetry/instrumentation-kafkajs');
const {OTLPTraceExporter} = require('@opentelemetry/exporter-trace-otlp-http');
const {OTLPMetricExporter} = require('@opentelemetry/exporter-metrics-otlp-http');
const {PeriodicExportingMetricReader} = require('@opentelemetry/sdk-metrics');
const {
    // Detector imports commented out as they're not currently used in synchronous init
    // envDetectorSync,
    // processDetectorSync,
    // hostDetectorSync,
    // osDetectorSync,
    defaultResource,
    resourceFromAttributes,
} = require('@opentelemetry/resources');
const {SemanticResourceAttributes} = require('@opentelemetry/semantic-conventions');
const {diag, DiagConsoleLogger, DiagLogLevel} = require('@opentelemetry/api');
const {RuntimeNodeInstrumentation} = require('@opentelemetry/instrumentation-runtime-node');
const {CompositePropagator, W3CTraceContextPropagator, W3CBaggagePropagator} = require('@opentelemetry/core');
const {BatchSpanProcessor} = require('@opentelemetry/sdk-trace-base');
const {performance, monitorEventLoopDelay} = require('perf_hooks');
const sharedMetrics = require('./metrics');

const getStandardizedRoute = sharedMetrics.getStandardizedRoute;

// These will be initialized after SDK setup
let meter;
let applicationMetrics;
let httpMetrics;
let serverDurationMetric;

// Track previous CPU usage for delta calculation
let previousCpuUsage = process.cpuUsage();

const createApplicationMetrics = sharedMetrics.createApplicationMetrics;

/**
 * Create HTTP metrics
 * @param {object} meterInstance - Meter instance
 * @returns {object} HTTP metrics object
 */
const createHttpMetrics = (meterInstance) => ({
    // Request metrics - using create* API
    requestTotal: meterInstance.createCounter('http.request.total', {
        description: 'Total number of HTTP requests',
    }),
    requestDuration: meterInstance.createHistogram('http.request.duration', {
        description: 'Duration of HTTP requests',
        unit: 'ms',
    }),
    requestSize: meterInstance.createHistogram('http.request.size', {
        description: 'Size of HTTP requests in bytes',
        unit: 'bytes',
    }),
    requestInFlight: meterInstance.createUpDownCounter('http.request.in_flight', {
        description: 'Number of HTTP requests currently in flight',
    }),
    requestQueueDuration: meterInstance.createHistogram('http.request.queue_duration', {
        description: 'Time spent in queue before processing',
        unit: 'ms',
    }),

    // Response metrics - using create* API
    responseSize: meterInstance.createHistogram('http.response.size', {
        description: 'Size of HTTP responses in bytes',
        unit: 'bytes',
    }),
    responseStatusTotal: meterInstance.createCounter('http.response.status_total', {
        description: 'Total number of HTTP responses by status code',
    }),

    // Connection metrics - using create* API
    connectionsTotal: meterInstance.createUpDownCounter('http.connections.total', {
        description: 'Total number of HTTP connections currently open',
    }),
    connectionDuration: meterInstance.createHistogram('http.connection.duration', {
        description: 'Duration of HTTP connections',
        unit: 'ms',
    }),

    // Error metrics - using create* API
    errorTotal: meterInstance.createCounter('http.error.total', {
        description: 'Total number of HTTP errors',
    }),
    timeoutTotal: meterInstance.createCounter('http.timeout.total', {
        description: 'Total number of HTTP timeouts',
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

/**
 * Get common attributes for telemetry
 * @param {object} request - Request object
 * @param {object} response - Response object
 * @returns {object} Common attributes
 */
const getCommonAttributes = (request, response = null) => {
    // Single object construction for hot path optimization
    return Object.assign(
        {},
        getBaseAttributes(),
        getRequestAttributes(request),
        getResponseAttributes(response),
        getCustomAttributes(request)
    );
};

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

    const serviceName = process.env.OTEL_SERVICE_NAME || 'unknown-service';
    if (serviceName) {
        attributes.service_name = serviceName;
    }

    return attributes;
};

/**
 * Get request attributes
 * @param {object} request - Request object
 * @returns {object} Request attributes
 */
const getRequestAttributes = (request) => {
    if (!request) {
        return {};
    }

    // Build object with only defined values for performance
    const attributes = {
        'http.request.method': request.method || 'UNKNOWN-METHOD',
        'url.path': getStandardizedRoute(request)
    };

    // Add optional attributes only if they exist
    if (request.url || request.path) {
        attributes['url.full'] = request.url || request.path;
    }
    if (request.headers?.host) {
        attributes['server.address'] = request.headers.host;
    }
    if (request.headers?.['user-agent']) {
        attributes['user_agent.original'] = request.headers['user-agent'];
    }
    if (request.httpVersion) {
        attributes['network.protocol.version'] = request.httpVersion;
    }
    if (request.socket?.remoteAddress) {
        attributes['client.address'] = request.socket.remoteAddress;
    }
    if (request.headers?.['content-type']) {
        attributes['http.request.header.content-type'] = request.headers['content-type'];
    }
    if (request.headers?.['content-encoding']) {
        attributes['http.request.header.content-encoding'] = request.headers['content-encoding'];
    }

    const requestId = request.headers?.['x-request-id'] || request.id;
    if (requestId) {
        attributes['http.request.header.x-request-id'] = requestId;
    }

    return attributes;
};

/**
 * Get response attributes
 * @param {object} response - Response object
 * @returns {object} Response attributes
 */
const getResponseAttributes = (response) => {
    if (!response?.statusCode) {
        return {};
    }

    // Build with required attributes
    const attributes = {
        'http.response.status_code': String(response.statusCode),
        'http.response.status_class': String(Math.floor(response.statusCode / 100) * 100)
    };

    // Add optional attributes inline
    const responseContentType = response.getHeader?.('content-type');
    if (responseContentType) {
        attributes['http.response.header.content-type'] = responseContentType;
    }

    const responseSize = response.getHeader?.('content-length');
    if (responseSize) {
        attributes['http.response.body.size'] = responseSize;
    }

    return attributes;
};

/**
 * Get custom attributes
 * @param {object} request - Request object
 * @returns {object} Custom attributes
 */
const getCustomAttributes = (request) => {
    if (!request?.headers) {
        return {};
    }

    const attributes = {};

    // Only add if headers exist
    if (request.headers['x-tenant-id']) {
        attributes['custom.tenant_id'] = request.headers['x-tenant-id'];
    }
    if (request.headers['x-user-id']) {
        attributes['custom.user_id'] = request.headers['x-user-id'];
    }
    if (request.headers['x-correlation-id']) {
        attributes['custom.correlation_id'] = request.headers['x-correlation-id'];
    }

    return attributes;
};

const getMetricAttributes = sharedMetrics.getMetricAttributes;

/**
 * Safely get content length from headers
 * @param {object} headers - Headers object
 * @returns {number} Content length
 */
const getContentLength = (headers) => {
    try {
        return parseInt(headers?.['content-length']) || 0;
    }
    catch (error) {
        return 0;
    }
};

// Track previous ELU for calculating utilization
let previousELU = performance.eventLoopUtilization();

// Track previous memory values for UpDownCounter - removed unused variable
// Memory tracking state was previously stored here but is now initialized inline
// when needed within the SDK startup process

// Mutable state for collectSystemMetrics
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
     * @returns {Promise<void>} Graceful shutdown promise
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
        console.log('[OTEL] OpenTelemetry is disabled (OTEL_ENABLED !== true)');
        _rejectSdkReady(new Error('OpenTelemetry disabled'));
        return;
    }

    console.log('[OTEL] Starting synchronous OpenTelemetry initialization...');
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
        // Auto-detect resources with safe detector loading
        // Note: Detectors are available but not currently used in synchronous init
        // const availableDetectors = [
        //     envDetectorSync,
        //     processDetectorSync,
        //     hostDetectorSync,
        //     osDetectorSync,
        // ].filter(detector => detector !== undefined);

        // Create basic resource synchronously (avoiding async detectors for synchronous init)
        const detectedResource = resourceFromAttributes({});

        // Merge detected resources with service-specific attributes
        const resource = defaultResource().merge(
            resourceFromAttributes({
                [SemanticResourceAttributes.SERVICE_NAME]: OTEL_CONFIG.SERVICE_NAME,
                [SemanticResourceAttributes.SERVICE_VERSION]: OTEL_CONFIG.SERVICE_VERSION,
                [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: OTEL_CONFIG.ENVIRONMENT,
                // Custom attributes that aren't auto-detected
                'application': 'countly',
            })
        ).merge(detectedResource);

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
        // Fixed configuration based on official OpenTelemetry documentation
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
                '@opentelemetry/instrumentation-kafkajs': {
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
                applyCustomAttributesOnSpan: (span, request) => {
                    try {
                        // Basic attributes
                        const attributes = getCommonAttributes(request);
                        Object.entries(attributes).forEach(([key, value]) => {
                            if (key && value !== undefined && value !== null) {
                                span.setAttribute(key, String(value));
                            }
                        });

                        // Service graph attributes
                        // Note: peer.service is only set for outbound calls (x-target-service header).
                        // It is NOT set to the local service name — that distorts service graphs.
                        const serviceName = process.env.OTEL_SERVICE_NAME;
                        const serviceVersion = process.env.npm_package_version || '0.0.0';

                        const targetService = request.headers?.['x-target-service'];
                        if (targetService) {
                            span.setAttribute('peer.service', targetService);
                        }

                        if (serviceVersion) {
                            span.setAttribute('service.version', serviceVersion);
                        }

                        const instanceId = process.env.KUBERNETES_POD_NAME || require('os').hostname();
                        if (instanceId) {
                            span.setAttribute('service.instance.id', instanceId);
                        }

                        const namespace = process.env.KUBERNETES_NAMESPACE || 'default';
                        if (namespace) {
                            span.setAttribute('service.namespace', namespace);
                        }

                        const hostHeader = request.headers?.host;
                        if (hostHeader && serviceName) {
                            const isExternal = !hostHeader.includes(serviceName);
                            span.setAttribute('service.call.type', isExternal ? 'external' : 'internal');
                        }
                    }
                    catch (error) {
                        console.error('Error applying attributes to span:', error);
                    }
                },
                requestHook: (span, request) => {
                    try {
                        // Add traceparent attributes if available
                        const traceParent = request?.headers?.traceparent;
                        if (traceParent) {
                            span.setAttribute('nginx.trace_id', traceParent);
                            span.setAttribute('nginx.traceparent', traceParent);
                        }

                        const startTime = Date.now();
                        const standardizedRoute = getStandardizedRoute(request);
                        const metricAttrs = getMetricAttributes(request);

                        // Helper functions for metric operations - use low-cardinality attrs only
                        const add = function(metric, value = 1, extra = {}) {
                            return metric.add(value, {...metricAttrs, ...extra});
                        };
                        const record = function(metric, value, extra = {}) {
                            return metric.record(value, {...metricAttrs, ...extra});
                        };

                        span.updateName(`${request.method || 'UNKNOWN-METHOD'} ${standardizedRoute}`);

                        // Record initial metrics
                        if (httpMetrics) {
                            try {
                                add(httpMetrics.requestInFlight);
                                add(httpMetrics.connectionsTotal);
                                add(httpMetrics.requestTotal);

                                const contentLength = getContentLength(request.headers);
                                if (contentLength > 0) {
                                    record(httpMetrics.requestSize, contentLength);
                                }
                            }
                            catch (metricError) {
                                console.error('Error recording initial metrics:', metricError);
                            }
                        }

                        // ClientRequest (outgoing) has getHeader(); IncomingMessage (incoming) does not
                        const isOutgoing = typeof request.getHeader === 'function';

                        if (isOutgoing) {
                            // Outgoing: response event fires when remote server responds
                            const connectionStartTime = Date.now();

                            request.on('response', (response) => {
                                try {
                                    const responseTime = Date.now();
                                    const statusCode = String(response.statusCode);
                                    const extra = {'http_status_code': statusCode};

                                    add(httpMetrics.responseStatusTotal, 1, extra);
                                    record(serverDurationMetric, responseTime - startTime, extra);
                                    record(httpMetrics.requestQueueDuration, responseTime - startTime, extra);

                                    const responseSize = getContentLength(response.headers);
                                    if (responseSize > 0) {
                                        record(httpMetrics.responseSize, responseSize, extra);
                                    }

                                    if (response.statusCode >= 400) {
                                        add(httpMetrics.errorTotal, 1, extra);
                                    }

                                    response.on('end', () => {
                                        try {
                                            const duration = Date.now() - startTime;
                                            const connectionDuration = Date.now() - connectionStartTime;

                                            record(httpMetrics.requestDuration, duration, extra);
                                            record(httpMetrics.connectionDuration, connectionDuration, extra);
                                            add(httpMetrics.requestInFlight, -1, extra);
                                            add(httpMetrics.connectionsTotal, -1, extra);
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

                            request.on('timeout', () => {
                                try {
                                    add(httpMetrics.timeoutTotal, 1, {'error_type': 'timeout'});
                                }
                                catch (timeoutError) {
                                    console.error('Error handling timeout metrics:', timeoutError);
                                }
                            });

                            request.on('error', (err) => {
                                try {
                                    add(httpMetrics.errorTotal, 1, {
                                        'error_type': err.name || 'unknown'
                                    });
                                }
                                catch (errorMetricError) {
                                    console.error('Error handling error metrics:', errorMetricError);
                                }
                            });
                        }
                        else {
                            // Incoming: store startTime for responseHook to use
                            request._otelStartTime = startTime;
                        }
                    }
                    catch (hookError) {
                        console.error('Error in request hook:', hookError);
                    }
                },
                responseHook: (span, response) => {
                    try {
                        // ServerResponse (incoming) has .req; IncomingMessage (outgoing response) does not
                        if (!response.req || !httpMetrics) {
                            return;
                        }
                        const request = response.req;
                        const startTime = request._otelStartTime;
                        if (!startTime) {
                            return;
                        }

                        const duration = Date.now() - startTime;
                        const metricAttrs = getMetricAttributes(request);
                        const statusCode = String(response.statusCode);
                        const extra = {'http_status_code': statusCode};

                        httpMetrics.responseStatusTotal.add(1, {...metricAttrs, ...extra});
                        httpMetrics.requestDuration.record(duration, {...metricAttrs, ...extra});
                        if (serverDurationMetric) {
                            serverDurationMetric.record(duration, {...metricAttrs, ...extra});
                        }

                        const responseSize = parseInt(response.getHeader?.('content-length')) || 0;
                        if (responseSize > 0) {
                            httpMetrics.responseSize.record(responseSize, {...metricAttrs, ...extra});
                        }

                        if (response.statusCode >= 400) {
                            httpMetrics.errorTotal.add(1, {...metricAttrs, ...extra});
                        }

                        httpMetrics.requestInFlight.add(-1, metricAttrs);
                        httpMetrics.connectionsTotal.add(-1, metricAttrs);
                    }
                    catch (error) {
                        console.error('Error in response hook:', error);
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
                    // Add log level and message to span
                    if (record.level) {
                        span.setAttribute('log.level', record.level);
                    }
                    if (record.msg) {
                        span.setAttribute('log.message', record.msg);
                    }

                    // Handle errors
                    if (record.err) {
                        span.recordException(record.err);
                        span.setStatus({
                            code: 2, // ERROR
                            message: record.err.message || 'Unknown error'
                        });
                    }

                    // Add custom fields from log record
                    if (record.reqId) {
                        span.setAttribute('log.request_id', record.reqId);
                    }
                    if (record.userId) {
                        span.setAttribute('log.user_id', record.userId);
                    }
                },
                disableLogCorrelation: false,
            }),
            // KafkaJS instrumentation for producers/consumers
            // Automatically injects/extracts W3C trace context via Kafka headers
            new KafkaJsInstrumentation({
                // Keep defaults for safety; hooks can be added later if needed
            }),
        ];

        // Add profiling instrumentation if available and enabled
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
                    wall: {collectCpuTime: true},
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

        // Create metricReader for NodeSDK (Problem #1 fix)
        const metricReader = new PeriodicExportingMetricReader({
            exporter: metricExporter,
            exportIntervalMillis: OTEL_CONFIG.METRIC_EXPORT_INTERVAL,
            exportTimeoutMillis: Math.max(1000, Math.min(5000, OTEL_CONFIG.METRIC_EXPORT_INTERVAL - 100)),
        });

        // Create SDK with enhanced configuration
        sdkInstance = new NodeSDK({
            resource: resource,
            metricReader: metricReader,
            instrumentations: instrumentations,
            spanProcessor: new BatchSpanProcessor(traceExporter, {
                maxQueueSize: OTEL_CONFIG.MAX_QUEUE_SIZE,
                maxExportBatchSize: OTEL_CONFIG.MAX_EXPORT_BATCH_SIZE,
                scheduledDelayMillis: OTEL_CONFIG.BATCH_TIMEOUT,
            }),
            textMapPropagator: new CompositePropagator({
                propagators: [
                    new W3CTraceContextPropagator(),
                    new W3CBaggagePropagator(),
                ],
            }),
        });

        // Start collecting system metrics
        const metricsInterval = setInterval(collectSystemMetrics, 5000);
        metricsInterval.unref();

        // Setup event loop delay monitoring (Node 18+)
        let eventLoopMonitor;
        let eventLoopInterval;
        try {
            eventLoopMonitor = monitorEventLoopDelay({resolution: 10});
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
            eventLoopInterval.unref();

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
            gcObserver.observe({entryTypes: ['gc']});
        }
        catch (error) {
            console.error('Failed to setup GC observer:', error);
        }

        /**
         * Handle graceful shutdown
         * @returns {Promise<void>} Graceful shutdown promise
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

                // Now create metrics after SDK is started using global meter
                const { metrics } = require('@opentelemetry/api');
                meter = metrics.getMeter('application-metrics');
                applicationMetrics = createApplicationMetrics(meter);
                httpMetrics = createHttpMetrics(meter);
                serverDurationMetric = createServerDurationMetric(meter);

                // Initialize previous memory values to current values to avoid huge initial deltas
                // Memory tracking is handled by the ObservableGauges directly
                // const initialMemory = process.memoryUsage();

                // Create runtime observable gauges (event loop, memory)
                const baseAttrs = getBaseAttributes();
                sharedMetrics.createRuntimeObservableGauges(meter, baseAttrs, eventLoopMonitor);

                console.log('[OTEL] ✅ OpenTelemetry initialized successfully!');
                sdkInitialized = true;
                _resolveSdkReady();
                return Promise.resolve();
            },
            3,
            1000
        ).catch((err) => {
            console.error('[OTEL] retryWithBackoff exhausted:', err);
            _rejectSdkReady(err);
        });
    }
    catch (error) {
        console.error('[OTEL] ❌ Failed to initialize OpenTelemetry:', error);
        _rejectSdkReady(error);
        // Don't exit, let the application continue without telemetry
    }
}

// Initialize immediately if enabled
if (process.env.OTEL_ENABLED === 'true') {
    initializeOpenTelemetry();
}

module.exports = {
    sdkReady,
    getCommonAttributes,
    errorHandlingStrategies,
};
