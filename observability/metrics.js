/**
 * Shared observability metrics module
 * Extracted from otel.js and otelexpress.js to eliminate duplication
 * @module core/observability/metrics
 */

const {performance} = require('perf_hooks');

/**
 * Regex patterns for parameterizing dynamic path segments to prevent cardinality explosion.
 * Applied in order — first match wins per segment.
 */
const DYNAMIC_SEGMENT_PATTERNS = [
    // UUID v1–v5 (8-4-4-4-12 hex)
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    // MongoDB ObjectId (24 hex chars)
    /^[0-9a-f]{24}$/i,
    // Pure numeric IDs
    /^\d+$/,
    // Hex strings ≥ 16 chars (API keys, tokens, hashes)
    /^[0-9a-f]{16,}$/i,
];

/**
 * Get standardized route from request, replacing dynamic path segments
 * with `:id` to keep metric cardinality bounded.
 * @param {object} req - Request object
 * @returns {string} Standardized route path
 */
const getStandardizedRoute = (req) => {
    try {
        const raw = req?.url?.split('?')[0] || req?.path?.split('?')[0] || '/';
        // Parameterize dynamic segments
        return raw.split('/').map(seg => {
            if (!seg) {
                return seg;
            }
            for (const pattern of DYNAMIC_SEGMENT_PATTERNS) {
                if (pattern.test(seg)) {
                    return ':id';
                }
            }
            return seg;
        }).join('/');
    }
    catch (error) {
        return '/';
    }
};

/**
 * Get low-cardinality attributes for metric recording
 * Span attributes remain rich (via applyCustomAttributesOnSpan), but metric labels
 * must be bounded to prevent Prometheus series explosion.
 * @param {object} request - Request object
 * @param {object} response - Response object (optional)
 * @returns {object} Low-cardinality metric attributes
 */
const getMetricAttributes = (request, response = null) => {
    const attrs = {
        'http.request.method': request?.method || 'UNKNOWN-METHOD',
        'url.path': getStandardizedRoute(request),
    };
    if (response?.statusCode) {
        attrs['http.response.status_code'] = String(response.statusCode);
        attrs['http.response.status_class'] = String(Math.floor(response.statusCode / 100) * 100);
    }
    return attrs;
};

/**
 * Get base attributes for telemetry
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

/**
 * Create application metrics (CPU, event loop, GC)
 * @param {object} meterInstance - Meter instance
 * @returns {object} Application metrics object
 */
const createApplicationMetrics = (meterInstance) => ({
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
    gcPauseTime: meterInstance.createHistogram('custom.gc.pause_ns', {
        description: 'Garbage collection pause time',
        unit: 'ns',
    }),
    gcCount: meterInstance.createCounter('custom.gc.count', {
        description: 'Number of garbage collections',
    }),
});

/**
 * Create runtime observable gauges for event loop and memory
 * @param {object} meterInstance - Meter instance
 * @param {object} baseAttrs - Cached base attributes
 * @param {object} eventLoopMonitor - Event loop delay monitor instance
 * @returns {void}
 */
const createRuntimeObservableGauges = (meterInstance, baseAttrs, eventLoopMonitor) => {
    // Event loop lag gauges — use batch observable callback for atomic collection + reset
    const lagMax = meterInstance.createObservableGauge('nodejs.eventloop.lag.max', {
        description: 'Maximum event loop lag since last measurement', unit: 'ms',
    });
    const lagMean = meterInstance.createObservableGauge('nodejs.eventloop.lag.mean', {
        description: 'Mean event loop lag', unit: 'ms',
    });
    const lagP99 = meterInstance.createObservableGauge('nodejs.eventloop.lag.p99', {
        description: '99th percentile event loop lag', unit: 'ms',
    });

    meterInstance.addBatchObservableCallback((result) => {
        if (eventLoopMonitor) {
            result.observe(lagMax, eventLoopMonitor.max / 1e6, baseAttrs);
            result.observe(lagMean, eventLoopMonitor.mean / 1e6, baseAttrs);
            result.observe(lagP99, eventLoopMonitor.percentile(99) / 1e6, baseAttrs);
            eventLoopMonitor.reset();
        }
    }, [lagMax, lagMean, lagP99]);

    // Memory gauges — single batch callback to call memoryUsage() once
    const memRss = meterInstance.createObservableGauge('process.memory.usage', {
        description: 'Process memory usage (RSS)', unit: 'bytes',
    });
    const memHeapUsed = meterInstance.createObservableGauge('process.memory.heap.used', {
        description: 'Process heap used memory', unit: 'bytes',
    });
    const memHeapTotal = meterInstance.createObservableGauge('process.memory.heap.total', {
        description: 'Process heap total memory', unit: 'bytes',
    });
    const memExternal = meterInstance.createObservableGauge('process.memory.external', {
        description: 'Process external memory usage', unit: 'bytes',
    });

    meterInstance.addBatchObservableCallback((result) => {
        const mem = process.memoryUsage();
        result.observe(memRss, mem.rss, baseAttrs);
        result.observe(memHeapUsed, mem.heapUsed, baseAttrs);
        result.observe(memHeapTotal, mem.heapTotal, baseAttrs);
        result.observe(memExternal, mem.external, baseAttrs);
    }, [memRss, memHeapUsed, memHeapTotal, memExternal]);
};

/**
 * Get GC type name from kind
 * @param {number} kind - GC kind number
 * @returns {string} GC type name
 */
const getGCType = (kind) => {
    const gcTypes = {
        1: 'scavenge',
        2: 'mark_sweep_compact',
        4: 'incremental_marking',
        8: 'weak_callbacks',
        16: 'all'
    };
    return gcTypes[kind] || 'unknown';
};

/**
 * Setup GC observer that records metrics
 * @param {function} getApplicationMetricsFn - Getter function returning application metrics object (or null)
 * @param {function} getBaseAttributesFn - Function returning base attributes
 * @returns {PerformanceObserver} The GC observer (caller must call .observe() and handle cleanup)
 */
const setupGCObserver = (getApplicationMetricsFn, getBaseAttributesFn) => {
    const {PerformanceObserver} = require('perf_hooks');
    const gcObserver = new PerformanceObserver((list) => {
        const appMetrics = getApplicationMetricsFn();
        if (!appMetrics) {
            return;
        }
        const attributes = getBaseAttributesFn();
        const entries = list.getEntries();

        for (const entry of entries) {
            if (entry.kind !== undefined) {
                appMetrics.gcPauseTime.record(entry.duration * 1e6, {
                    ...attributes,
                    'gc.type': getGCType(entry.kind)
                });
                appMetrics.gcCount.add(1, {
                    ...attributes,
                    'gc.type': getGCType(entry.kind)
                });
            }
        }
        gcObserver.takeRecords();
    });
    return gcObserver;
};

/**
 * Collect system metrics (CPU, event loop utilization)
 * @param {object} applicationMetrics - Application metrics object
 * @param {function} getBaseAttributesFn - Function returning base attributes
 * @param {object} state - Mutable state object with previousCpuUsage and previousELU
 * @returns {void}
 */
const collectSystemMetrics = (applicationMetrics, getBaseAttributesFn, state) => {
    if (!applicationMetrics) {
        return;
    }
    try {
        const attributes = getBaseAttributesFn();

        const currentCpuUsage = process.cpuUsage();
        const cpuDiff = process.cpuUsage(state.previousCpuUsage);

        if (cpuDiff.user) {
            applicationMetrics.processCpuUser.add(cpuDiff.user, attributes);
        }
        if (cpuDiff.system) {
            applicationMetrics.processCpuSystem.add(cpuDiff.system, attributes);
        }

        state.previousCpuUsage = currentCpuUsage;

        const currentELU = performance.eventLoopUtilization();
        const utilization = performance.eventLoopUtilization(currentELU, state.previousELU);
        if (utilization.utilization > 0) {
            applicationMetrics.eventLoopUtilization.record(utilization.utilization, attributes);
        }
        state.previousELU = currentELU;
    }
    catch (error) {
        console.error('Error collecting system metrics:', error);
    }
};

module.exports = {
    getStandardizedRoute,
    getMetricAttributes,
    getBaseAttributes,
    createApplicationMetrics,
    createRuntimeObservableGauges,
    getGCType,
    setupGCObserver,
    collectSystemMetrics,
};
