const http = require('http');
const pack = require('../package.json');
const cluster = require('cluster');
const formidable = require('formidable');
const os = require('os');
const countlyConfig = require('./config', 'dont-enclose');
const plugins = require('../plugins/pluginManager.js');
const jobs = require('./parts/jobs');
const log = require('./utils/log.js')('core:api');
const common = require('./utils/common.js');
const {processRequest} = require('./utils/requestProcessor');
const frontendConfig = require('../frontend/express/config.js');
const {CacheMaster, CacheWorker} = require('./parts/data/cache.js');
const {WriteBatcher, ReadBatcher, InsertBatcher} = require('./parts/data/batcher.js');
const versionInfo = require('../frontend/express/version.info.js');
const moment = require("moment");

/********** OpenTelemetry Prometheus Metrics **********/


const { MeterProvider /*, ConsoleMetricExporter, PeriodicExportingMetricReader*/ } = require('@opentelemetry/sdk-metrics');
const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { MongoDBInstrumentation } = require('@opentelemetry/instrumentation-mongodb');
// const { Resource } = require('@opentelemetry/resources');
// const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { /*metrics, */trace } = require('@opentelemetry/api');
// const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const gcStats = require('gc-stats')();
const v8 = require('v8');

// Create a resource that identifies your service
// const resource = new Resource({
//     [SemanticResourceAttributes.SERVICE_NAME]: 'countly-metrics',
//     [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
// });

// Create Prometheus exporter
const prometheusExporter = new PrometheusExporter({
    // host: 'localhost',
    // endpoint: '/metrics',
    port: 9464,
});

// Create MeterProvider
const meterProvider = new MeterProvider();

// Add Console exporter to MeterProvider
// meterProvider.addMetricReader(new PeriodicExportingMetricReader({
//     exporter: new ConsoleMetricExporter(),
//     exportIntervalMillis: 1000,
// }));

// Add Prometheus exporter to MeterProvider
meterProvider.addMetricReader(prometheusExporter);

// Get a meter
const meter = meterProvider.getMeter('countly-metrics');

// Create metrics
const httpRequestDuration = meter.createHistogram('http_request_duration_seconds', {
    description: 'Duration of HTTP requests in seconds',
});

const heapUsed = meter.createObservableGauge('nodejs_heap_used_bytes', {
    description: 'Node.js heap usage in bytes',
});

const heapTotal = meter.createObservableGauge('nodejs_heap_total_bytes', {
    description: 'Node.js total heap size in bytes',
});

const externalMemory = meter.createObservableGauge('nodejs_external_memory_bytes', {
    description: 'Node.js external memory usage in bytes',
});

const eventLoopLag = meter.createObservableGauge('nodejs_eventloop_lag_seconds', {
    description: 'Node.js event loop lag in seconds',
});

const cpuUser = meter.createObservableCounter('nodejs_cpu_user_seconds_total', {
    description: 'Node.js CPU time spent in user mode',
});

const cpuSystem = meter.createObservableCounter('nodejs_cpu_system_seconds_total', {
    description: 'Node.js CPU time spent in system mode',
});

const mongoDbOperationCounter = meter.createCounter('mongodb_operations_total', {
    description: 'Total number of MongoDB operations',
});

const mongoDbOperationDuration = meter.createHistogram('mongodb_operation_duration_seconds', {
    description: 'Duration of MongoDB operations in seconds',
});

// Process and OS metrics
const processMemoryUsage = meter.createObservableGauge('process_memory_usage_bytes', {
    description: 'Process memory usage in bytes',
});

const osMemoryUsage = meter.createObservableGauge('os_memory_usage_bytes', {
    description: 'OS memory usage in bytes',
});

const processCpuUsage = meter.createObservableGauge('process_cpu_usage_seconds', {
    description: 'Process CPU usage in seconds',
});

const osCpuUsage = meter.createObservableGauge('os_cpu_usage_percentage', {
    description: 'OS CPU usage percentage',
});

// Node.js specific metrics
const nodeActiveHandles = meter.createObservableGauge('node_active_handles', {
    description: 'Number of active handles',
});

const nodeActiveRequests = meter.createObservableGauge('node_active_requests', {
    description: 'Number of active requests',
});

// V8 heap metrics
const v8HeapStats = meter.createObservableGauge('v8_heap_stats', {
    description: 'V8 heap statistics',
});

const v8HeapSpaceStats = meter.createObservableGauge('v8_heap_space_stats', {
    description: 'V8 heap space statistics',
});

// New detailed GC metrics
const gcDuration = meter.createHistogram('gc_duration_seconds', {
    description: 'Duration of GC operations',
});

const gcPauseTime = meter.createObservableGauge('gc_pause_time_seconds', {
    description: 'Total pause time of GC operations',
});

const gcPhaseTime = meter.createObservableGauge('gc_phase_time_seconds', {
    description: 'Time spent in different GC phases',
});

const gcReclaimed = meter.createObservableGauge('gc_reclaimed_bytes', {
    description: 'Bytes reclaimed by GC',
});

// New detailed memory metrics
const nodeMemoryUsage = meter.createObservableGauge('node_memory_usage_bytes', {
    description: 'Memory usage of different Node.js components',
});


// GC stats tracking
let totalGCPauseTime = 0;
let totalMarkTime = 0;
let totalSweepTime = 0;
let totalCompactTime = 0;
let totalReclaimedBytes = 0;

gcStats.on('stats', (stats) => {
    const gcDurationSeconds = stats.pause / 1e9;
    gcDuration.record(gcDurationSeconds, { gctype: stats.gctype });

    totalGCPauseTime += gcDurationSeconds;
    totalMarkTime += (stats.pauseMS.mark || 0) / 1000;
    totalSweepTime += (stats.pauseMS.sweep || 0) / 1000;
    totalCompactTime += (stats.pauseMS.compact || 0) / 1000;
    totalReclaimedBytes += stats.diff.usedHeapSize || 0;

    gcPauseTime.addCallback((observableResult) => {
        observableResult.observe(totalGCPauseTime);
    });

    gcPhaseTime.addCallback((observableResult) => {
        observableResult.observe(totalMarkTime, { phase: 'mark' });
        observableResult.observe(totalSweepTime, { phase: 'sweep' });
        observableResult.observe(totalCompactTime, { phase: 'compact' });
    });

    gcReclaimed.addCallback((observableResult) => {
        observableResult.observe(totalReclaimedBytes);
    });
});


// Update metrics
// eslint-disable-next-line require-jsdoc
const updateMetrics = () => {
    // Process memory usage
    const memoryUsage = process.memoryUsage();
    Object.entries(memoryUsage).forEach(([key, value]) => {
        processMemoryUsage.addCallback((observableResult) => {
            observableResult.observe(value, { type: key });
        });
    });

    heapUsed.addCallback((observableResult) => {
        observableResult.observe(memoryUsage.heapUsed);
    });
    heapTotal.addCallback((observableResult) => {
        observableResult.observe(memoryUsage.heapTotal);
    });
    externalMemory.addCallback((observableResult) => {
        observableResult.observe(memoryUsage.external);
    });

    cpuUser.addCallback((observableResult) => {
        const cpuUsage = process.cpuUsage();
        observableResult.observe(cpuUsage.user / 1e6);
    });
    cpuSystem.addCallback((observableResult) => {
        const cpuUsage = process.cpuUsage();
        observableResult.observe(cpuUsage.system / 1e6);
    });

    // OS memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    osMemoryUsage.addCallback((observableResult) => {
        observableResult.observe(totalMem, { type: 'total' });
        observableResult.observe(freeMem, { type: 'free' });
        observableResult.observe(totalMem - freeMem, { type: 'used' });
    });

    // CPU usage
    const cpuUsage = process.cpuUsage();
    processCpuUsage.addCallback((observableResult) => {
        observableResult.observe(cpuUsage.user / 1e6, { type: 'user' });
        observableResult.observe(cpuUsage.system / 1e6, { type: 'system' });
    });

    const cpus = os.cpus();
    const totalCpuUsage = cpus.reduce((acc, cpu) => {
        acc.user += cpu.times.user;
        acc.nice += cpu.times.nice;
        acc.sys += cpu.times.sys;
        acc.idle += cpu.times.idle;
        acc.irq += cpu.times.irq;
        return acc;
    }, { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 });

    const totalTime = Object.values(totalCpuUsage).reduce((acc, time) => acc + time, 0);
    Object.entries(totalCpuUsage).forEach(([key, value]) => {
        osCpuUsage.addCallback((observableResult) => {
            observableResult.observe((value / totalTime) * 100, { type: key });
        });
    });

    // Node.js specific metrics
    nodeActiveHandles.addCallback((observableResult) => {
        observableResult.observe(process._getActiveHandles().length);
    });

    nodeActiveRequests.addCallback((observableResult) => {
        observableResult.observe(process._getActiveRequests().length);
    });

    // V8 heap stats
    const heapStats = v8.getHeapStatistics();
    Object.entries(heapStats).forEach(([key, value]) => {
        v8HeapStats.addCallback((observableResult) => {
            observableResult.observe(value, { stat: key });
        });
    });

    // V8 heap space stats
    const heapSpaceStats = v8.getHeapSpaceStatistics();
    heapSpaceStats.forEach((space) => {
        v8HeapSpaceStats.addCallback((observableResult) => {
            observableResult.observe(space.space_size, { space: space.space_name, stat: 'space_size' });
            observableResult.observe(space.space_used_size, { space: space.space_name, stat: 'space_used_size' });
            observableResult.observe(space.space_available_size, { space: space.space_name, stat: 'space_available_size' });
            observableResult.observe(space.physical_space_size, { space: space.space_name, stat: 'physical_space_size' });
        });
    });

    // Detailed Node.js memory usage
    nodeMemoryUsage.addCallback((observableResult) => {
        observableResult.observe(memoryUsage.rss, { component: 'rss' });
        observableResult.observe(memoryUsage.heapTotal, { component: 'heapTotal' });
        observableResult.observe(memoryUsage.heapUsed, { component: 'heapUsed' });
        observableResult.observe(memoryUsage.external, { component: 'external' });
        observableResult.observe(memoryUsage.arrayBuffers, { component: 'arrayBuffers' });
    });
    const startTime = process.hrtime();
    setImmediate(() => {
        const endTime = process.hrtime(startTime);
        const lag = endTime[0] * 1e9 + endTime[1];
        eventLoopLag.addCallback((observableResult) => {
            observableResult.observe(lag / 1e9);
        });
    });
};

// Update metrics every 5 seconds
setInterval(updateMetrics, 5000);

// MongoDB instrumentation
// let mongoClient;
const originalDbConnection = plugins.dbConnection;
plugins.dbConnection = async function(...args) {
    const db = await originalDbConnection.apply(this, args);
    // mongoClient = db.client;

    const methodsToWrap = ['collection', 'aggregate', 'find', 'findOne', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'insertOne', 'insertMany'];

    methodsToWrap.forEach(method => {
        const original = db[method];
        db[method] = function(...methodArgs) {
            const span = trace.getTracer('mongodb').startSpan(`MongoDB ${method}`);
            const startTime = Date.now();

            mongoDbOperationCounter.add(1, { operation: method });

            const result = original.apply(this, methodArgs);

            if (result && typeof result.then === 'function') {
                return result.then(
                    (res) => {
                        span.end();
                        const duration = (Date.now() - startTime) / 1000;
                        mongoDbOperationDuration.record(duration, { operation: method });
                        return res;
                    },
                    (err) => {
                        span.recordException(err);
                        span.end();
                        const duration = (Date.now() - startTime) / 1000;
                        mongoDbOperationDuration.record(duration, { operation: method });
                        throw err;
                    }
                );
            }

            span.end();
            const duration = (Date.now() - startTime) / 1000;
            mongoDbOperationDuration.record(duration, { operation: method });
            return result;
        };
    });

    return db;
};



// Instrument HTTP server
const originalHttpServer = http.Server;
http.Server = function(...args) {
    const server = new originalHttpServer(...args);
    server.on('request', (req, res) => {
        const start = process.hrtime();
        res.on('finish', () => {
            const duration = process.hrtime(start);
            const durationSeconds = duration[0] + duration[1] / 1e9;
            httpRequestDuration.record(durationSeconds, {
                method: req.method,
                route: req.url,
                code: res.statusCode.toString()
            });
        });
    });
    return server;
};

// Configure the SDK
const sdk = new NodeSDK({
    // resource: resource,
    traceExporter: prometheusExporter,
    instrumentations: [
        getNodeAutoInstrumentations(),
        new MongoDBInstrumentation({
            enhancedDatabaseReporting: true,
        }),
    ],
});

// Initialize the SDK
sdk.start((error) => {
    if (error) {
        console.log('Error initializing SDK:', error);
    }
    else {
        console.log('OpenTelemetry SDK initialized');
    }
});

// Gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
    sdk.shutdown()
        .then(() => console.log('SDK shut down successfully'))
        .catch((error) => console.log('Error shutting down SDK:', error))
        .finally(() => process.exit(0));
});

console.log('OpenTelemetry setup completed');







/********** OpenTelemetry Prometheus Metrics **********/

var t = ["countly:", "api"];
common.processRequest = processRequest;

if (cluster.isMaster) {
    console.log("Starting Countly", "version", versionInfo.version, "package", pack.version);
    if (!common.checkDatabaseConfigMatch(countlyConfig.mongodb, frontendConfig.mongodb)) {
        log.w('API AND FRONTEND DATABASE CONFIGS ARE DIFFERENT');
    }
    t.push("master");
    t.push("node");
    t.push(process.argv[1]);
}
else {
    t.push("worker");
    t.push("node");
}

// Finaly set the visible title
process.title = t.join(' ');

plugins.connectToAllDatabases().then(function() {
    common.writeBatcher = new WriteBatcher(common.db);
    common.readBatcher = new ReadBatcher(common.db);
    common.insertBatcher = new InsertBatcher(common.db);
    if (common.drillDb) {
        common.drillReadBatcher = new ReadBatcher(common.drillDb);
    }

    let workers = [];

    /**
    * Set Max Sockets
    */
    http.globalAgent.maxSockets = countlyConfig.api.max_sockets || 1024;

    /**
    * Set Plugins APIs Config
    */
    plugins.setConfigs("api", {
        domain: "",
        safe: false,
        session_duration_limit: 86400,
        country_data: true,
        city_data: true,
        event_limit: 500,
        event_segmentation_limit: 100,
        event_segmentation_value_limit: 1000,
        array_list_limit: 10,
        metric_limit: 1000,
        sync_plugins: false,
        session_cooldown: 15,
        request_threshold: 30,
        total_users: true,
        export_limit: 10000,
        prevent_duplicate_requests: true,
        metric_changes: true,
        offline_mode: false,
        reports_regenerate_interval: 3600,
        send_test_email: "",
        //data_retention_period: 0,
        batch_processing: true,
        //batch_on_master: false,
        batch_period: 10,
        batch_read_processing: true,
        //batch_read_on_master: false,
        batch_read_ttl: 600,
        batch_read_period: 60,
        user_merge_paralel: 1,
        trim_trailing_ending_spaces: false
    });

    /**
    * Set Plugins APPs Config
    */
    plugins.setConfigs("apps", {
        country: "TR",
        timezone: "Europe/Istanbul",
        category: "6"
    });

    /**
    * Set Plugins Security Config
    */
    plugins.setConfigs("security", {
        login_tries: 3,
        login_wait: 5 * 60,
        password_min: 8,
        password_char: true,
        password_number: true,
        password_symbol: true,
        password_expiration: 0,
        password_rotation: 3,
        password_autocomplete: true,
        robotstxt: "User-agent: *\nDisallow: /",
        dashboard_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nStrict-Transport-Security:max-age=31536000 ; includeSubDomains\nX-Content-Type-Options: nosniff",
        api_additional_headers: "X-Frame-Options:deny\nX-XSS-Protection:1; mode=block\nAccess-Control-Allow-Origin:*",
        dashboard_rate_limit_window: 60,
        dashboard_rate_limit_requests: 500,
        proxy_hostname: "",
        proxy_port: "",
        proxy_username: "",
        proxy_password: "",
        proxy_type: "https"
    });

    /**
    * Set Plugins Logs Config
    */
    plugins.setConfigs('logs', {
        debug: (countlyConfig.logging && countlyConfig.logging.debug) ? countlyConfig.logging.debug.join(', ') : '',
        info: (countlyConfig.logging && countlyConfig.logging.info) ? countlyConfig.logging.info.join(', ') : '',
        warn: (countlyConfig.logging && countlyConfig.logging.warn) ? countlyConfig.logging.warn.join(', ') : '',
        error: (countlyConfig.logging && countlyConfig.logging.error) ? countlyConfig.logging.error.join(', ') : '',
        default: (countlyConfig.logging && countlyConfig.logging.default) ? countlyConfig.logging.default : 'warn',
    }, undefined, () => {
        const cfg = plugins.getConfig('logs'), msg = {
            cmd: 'log',
            config: cfg
        };
        if (process.send) {
            process.send(msg);
        }
        require('./utils/log.js').ipcHandler(msg);
    });

    /**
    * Initialize Plugins
    */
    plugins.init();

    /**
    *  Trying to gracefully handle the batch state
    *  @param {number} code - error code
    */
    async function storeBatchedData(code) {
        try {
            await common.writeBatcher.flushAll();
            await common.insertBatcher.flushAll();
            console.log("Successfully stored batch state");
        }
        catch (ex) {
            console.log("Could not store batch state", ex);
        }
        process.exit(typeof code === "number" ? code : 1);
    }

    /**
    *  Handle before exit for gracefull close
    */
    process.on('beforeExit', (code) => {
        console.log('Received exit, trying to save batch state: ', code);
        storeBatchedData(code);
    });

    /**
    *  Handle exit events for gracefull close
    */
    ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
        'SIGBUS', 'SIGFPE', 'SIGSEGV', 'SIGTERM',
    ].forEach(function(sig) {
        process.on(sig, async function() {
            storeBatchedData(sig);
            console.log('Got signal: ' + sig);
        });
    });

    /**
    * Uncaught Exception Handler
    */
    process.on('uncaughtException', (err) => {
        console.log('Caught exception: %j', err, err.stack);
        if (log && log.e) {
            log.e('Logging caught exception');
        }
        console.trace();
        storeBatchedData(1);
    });

    /**
    * Unhandled Rejection Handler
    */
    process.on('unhandledRejection', (reason, p) => {
        console.log('Unhandled rejection for %j with reason %j stack ', p, reason, reason ? reason.stack : undefined);
        if (log && log.e) {
            log.e('Logging unhandled rejection');
        }
        console.trace();
    });

    /**
    * Pass To Master
    * @param {cluster.Worker} worker - worker thatw as spawned by master
    */
    const passToMaster = (worker) => {
        worker.on('message', (msg) => {
            if (msg.cmd === 'log') {
                workers.forEach((w) => {
                    if (w !== worker) {
                        w.send({
                            cmd: 'log',
                            config: msg.config
                        });
                    }
                });
                require('./utils/log.js').ipcHandler(msg);
            }
            else if (msg.cmd === "checkPlugins") {
                plugins.checkPluginsMaster();
            }
            else if (msg.cmd === "startPlugins") {
                plugins.startSyncing();
            }
            else if (msg.cmd === "endPlugins") {
                plugins.stopSyncing();
            }
            else if (msg.cmd === "batch_insert") {
                const {collection, doc, db} = msg.data;
                common.insertBatcher.insert(collection, doc, db);
            }
            else if (msg.cmd === "batch_write") {
                const {collection, id, operation, db} = msg.data;
                common.writeBatcher.add(collection, id, operation, db);
            }
            else if (msg.cmd === "batch_read") {
                const {collection, query, projection, multi, msgId} = msg.data;
                common.readBatcher.get(collection, query, projection, multi).then((data) => {
                    worker.send({ cmd: "batch_read", data: {msgId, data} });
                })
                    .catch((err) => {
                        worker.send({ cmd: "batch_read", data: {msgId, err} });
                    });
            }
            else if (msg.cmd === "batch_invalidate") {
                const {collection, query, projection, multi} = msg.data;
                common.readBatcher.invalidate(collection, query, projection, multi);
            }
            else if (msg.cmd === "dispatchMaster" && msg.event) {
                plugins.dispatch(msg.event, msg.data);
            }
            else if (msg.cmd === "dispatch" && msg.event) {
                workers.forEach((w) => {
                    w.send(msg);
                });
            }
        });
    };

    if (cluster.isMaster) {
        plugins.installMissingPlugins(common.db);
        common.runners = require('./parts/jobs/runner');
        common.cache = new CacheMaster(common.db);
        common.cache.start().then(() => {
            setImmediate(() => {
                plugins.dispatch('/cache/init', {});
            });
        }, e => {
            console.log(e);
            process.exit(1);
        });

        const workerCount = (countlyConfig.api.workers)
            ? countlyConfig.api.workers
            : os.cpus().length;

        for (let i = 0; i < workerCount; i++) {
            // there's no way to define inspector port of a worker in the code. So if we don't
            // pick a unique port for each worker, they conflict with each other.
            let nodeOptions = {};
            if (countlyConfig?.symlinked !== true) { // countlyConfig.symlinked is passed when running in a symlinked setup
                const inspectorPort = i + 1 + (common?.config?.masterInspectorPort || 9229);
                nodeOptions = { NODE_OPTIONS: "--inspect-port=" + inspectorPort };
            }
            const worker = cluster.fork(nodeOptions);
            workers.push(worker);
        }

        workers.forEach(passToMaster);

        cluster.on('exit', (worker) => {
            workers = workers.filter((w) => {
                return w !== worker;
            });
            const newWorker = cluster.fork();
            workers.push(newWorker);
            passToMaster(newWorker);
        });

        plugins.dispatch("/master", {});

        // Allow configs to load & scanner to find all jobs classes
        setTimeout(() => {
            jobs.job('api:topEvents').replace().schedule('at 00:01 am ' + 'every 1 day');
            jobs.job('api:ping').replace().schedule('every 1 day');
            jobs.job('api:clear').replace().schedule('every 1 day');
            jobs.job('api:clearTokens').replace().schedule('every 1 day');
            jobs.job('api:clearAutoTasks').replace().schedule('every 1 day');
            jobs.job('api:task').replace().schedule('every 5 minutes');
            jobs.job('api:userMerge').replace().schedule('every 10 minutes');
            //jobs.job('api:appExpire').replace().schedule('every 1 day');
        }, 10000);

        //Record as restarted

        var utcMoment = moment.utc();

        var incObj = {};
        incObj.r = 1;
        incObj[`d.${utcMoment.format("D")}.${utcMoment.format("H")}.r`] = 1;
        common.db.collection("diagnostic").updateOne({"_id": "no-segment_" + utcMoment.format("YYYY:M")}, {"$set": {"m": utcMoment.format("YYYY:M")}, "$inc": incObj}, {"upsert": true}, function(err) {
            if (err) {
                log.e(err);
            }
        });
    }
    else {
        console.log("Starting worker", process.pid, "parent:", process.ppid);
        const taskManager = require('./utils/taskmanager.js');

        common.cache = new CacheWorker(common.db);
        common.cache.start();

        //since process restarted mark running tasks as errored
        taskManager.errorResults({db: common.db});

        process.on('message', common.log.ipcHandler);

        process.on('message', (msg) => {
            if (msg.cmd === 'log') {
                common.log.ipcHandler(msg);
            }
            else if (msg.cmd === "dispatch" && msg.event) {
                plugins.dispatch(msg.event, msg.data || {});
            }
        });

        process.on('exit', () => {
            console.log('Exiting due to master exited');
        });

        plugins.dispatch("/worker", {common: common});

        http.Server((req, res) => {
            const params = {
                qstring: {},
                res: res,
                req: req
            };

            if (req.method.toLowerCase() === 'post') {
                const formidableOptions = {};
                if (countlyConfig.api.maxUploadFileSize) {
                    formidableOptions.maxFileSize = countlyConfig.api.maxUploadFileSize;
                }

                const form = new formidable.IncomingForm(formidableOptions);
                req.body = '';
                req.on('data', (data) => {
                    req.body += data;
                });

                let multiFormData = false;
                // Check if we have 'multipart/form-data'
                if (req.headers['content-type']?.startsWith('multipart/form-data')) {
                    multiFormData = true;
                }

                form.parse(req, (err, fields, files) => {
                    //handle bakcwards compatability with formiddble v1
                    for (let i in files) {
                        if (files[i].filepath) {
                            files[i].path = files[i].filepath;
                        }
                        if (files[i].mimetype) {
                            files[i].type = files[i].mimetype;
                        }
                        if (files[i].originalFilename) {
                            files[i].name = files[i].originalFilename;
                        }
                    }
                    params.files = files;
                    if (multiFormData) {
                        let formDataUrl = [];
                        for (const i in fields) {
                            params.qstring[i] = fields[i];
                            formDataUrl.push(`${i}=${fields[i]}`);
                        }
                        params.formDataUrl = formDataUrl.join('&');
                    }
                    else {
                        for (const i in fields) {
                            params.qstring[i] = fields[i];
                        }
                    }
                    if (!params.apiPath) {
                        processRequest(params);
                    }
                });
            }
            else if (req.method.toLowerCase() === 'options') {
                const headers = {};
                headers["Access-Control-Allow-Origin"] = "*";
                headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
                headers["Access-Control-Allow-Headers"] = "countly-token, Content-Type";
                res.writeHead(200, headers);
                res.end();
            }
            //attempt process GET request
            else if (req.method.toLowerCase() === 'get') {
                processRequest(params);
            }
            else {
                common.returnMessage(params, 405, "Method not allowed");
            }
        }).listen(common.config.api.port, common.config.api.host || '').timeout = common.config.api.timeout || 120000;

        plugins.loadConfigs(common.db);
    }
});