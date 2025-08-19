const countlyConfig = require('./config', 'dont-enclose');
const plugins = require('../plugins/pluginManager.js');
const log = require('./utils/log.js')('aggregator-core:api');
const common = require('./utils/common.js');
const {WriteBatcher} = require('./parts/data/batcher.js');
const {Cacher} = require('./parts/data/cacher.js');
const UnifiedEventSource = require('./eventSource/UnifiedEventSource.js');
const usage = require('./aggregator/usage.js');
var t = ["countly:", "aggregator"];
t.push("node");

// Finaly set the visible title
process.title = t.join(' ');

console.log("Connecting to databases");

// TEMPORARY DEBUG LOGGING - AGGREGATOR
console.log('=== AGGREGATOR CONFIG DEBUG ===');
console.log('countlyConfig:', JSON.stringify(countlyConfig, null, 2));
console.log('Process ENV:', {
    NODE_ENV: process.env.NODE_ENV,
    SERVICE_TYPE: process.env.SERVICE_TYPE,
    COUNTLY_CONFIG_PATH: process.env.COUNTLY_CONFIG_PATH
});
console.log('=== END AGGREGATOR CONFIG DEBUG ===');

//Overriding function
plugins.loadConfigs = plugins.loadConfigsIngestor;

plugins.connectToAllDatabases(true).then(function() {
    log.i("Db connections done");
    // common.writeBatcher = new WriteBatcher(common.db);

    common.writeBatcher = new WriteBatcher(common.db);
    common.secondaryWriteBatcher = new WriteBatcher(common.db);
    common.readBatcher = new Cacher(common.db); //Used for Apps info

    common.readBatcher.transformationFunctions = {
        "event_object": function(data) {
            if (data && data.list) {
                data._list = {};
                data._list_length = 0;
                for (let i = 0; i < data.list.length; i++) {
                    data._list[data.list[i]] = true;
                    data._list_length++;
                }
            }
            if (data && data.segments) {
                data._segments = {};
                for (var key in data.segments) {
                    data._segments[key] = {};
                    data._segments[key]._list = {};
                    data._segments[key]._list_length = 0;
                    for (let i = 0; i < data.segments[key].length; i++) {
                        data._segments[key]._list[data.segments[key][i]] = true;
                        data._segments[key]._list_length++;
                    }
                }
            }
            if (data && data.omitted_segments) {
                data._omitted_segments = {};
                for (var key3 in data.omitted_segments) {
                    for (let i = 0; i < data.omitted_segments[key3].length; i++) {
                        data._omitted_segments[key3] = data._omitted_segments[key3] || {};
                        data._omitted_segments[key3][data.omitted_segments[key3][i]] = true;
                    }
                }
            }

            if (data && data.whitelisted_segments) {
                data._whitelisted_segments = {};
                for (var key4 in data.whitelisted_segments) {
                    for (let i = 0; i < data.whitelisted_segments[key4].length; i++) {
                        data._whitelisted_segments[key4] = data._whitelisted_segments[key4] || {};
                        data._whitelisted_segments[key4][data.whitelisted_segments[key4][i]] = true;
                    }
                }
            }
            return data;
        }
    };


    //Events processing
    plugins.register("/aggregator", async function() {
        const eventSource = new UnifiedEventSource('event-aggregator', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert", "fullDocument.e": "[CLY]_custom"}},
                    {"$project": {"__iid": "$fullDocument._id", "cd": "$fullDocument.cd", "a": "$fullDocument.a", "e": "$fullDocument.e", "n": "$fullDocument.n", "ts": "$fullDocument.ts", "sg": "$fullDocument.sg", "c": "$fullDocument.c", "s": "$fullDocument.s", "dur": "$fullDocument.dur"}}
                ],
                fallback: {
                    pipeline: [{
                        "$match": {"e": {"$in": ["[CLY]_custom"]}}
                    }, {"$project": {"__id": "$_id", "cd": "$cd", "a": "$a", "e": "$e", "n": "$n", "ts": "$ts", "sg": "$sg", "c": "$c", "s": "$s", "dur": "$dur"}}]
                }
            }
        });
        try {
            for await (const {token, events} of eventSource) {
                if (events && Array.isArray(events)) {
                    // Process each event in the batch
                    for (const currEvent of events) {
                        if (currEvent && currEvent.a && currEvent.e) {
                            await usage.processEventFromStream(token, currEvent);
                        }
                    }
                }
            }
        }
        catch (err) {
            log.e('Event processing error:', err);
        }
    });


    //Sessions processing
    plugins.register("/aggregator", async function() {
        const sessionSource = new UnifiedEventSource('session-aggregator', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "insert", "fullDocument.e": "[CLY]_session"}},
                    {"$addFields": {"__id": "$fullDocument._id", "cd": "$fullDocument.cd"}}
                ],
                fallback: {
                    pipeline: [{
                        "$match": {"e": {"$in": ["[CLY]_session"]}}
                    }]
                }
            }
        });

        // Process sessions using async iterator pattern
        try {
            for await (const { token, events } of sessionSource) {
                if (events && Array.isArray(events)) {
                    // Process each session event in the batch - PROPERLY AWAIT EACH ONE
                    for (const currEvent of events) {
                        if (currEvent && currEvent.a) {
                            try {
                                // Convert callback to Promise and await it
                                const app = await new Promise((resolve, reject) => {
                                    common.readBatcher.getOne("apps", common.db.ObjectID(currEvent.a), function(err, appResponse) {
                                        if (err) {
                                            reject(err);
                                        }
                                        else {
                                            resolve(appResponse);
                                        }
                                    });
                                });

                                if (app) {
                                    usage.processSessionFromStream(token, currEvent, {
                                        "app_id": currEvent.a,
                                        "app": app,
                                        "time": common.initTimeObj(app.timezone, currEvent.ts),
                                        "appTimezone": (app.timezone || "UTC")
                                    });
                                }
                            }
                            catch (err) {
                                log.e("Error getting app data for session", err);
                                // Continue processing other events in batch
                            }
                        }
                    }
                }
                // Note: Auto-acknowledgment happens when iterator moves to next batch
            }
        }
        catch (err) {
            log.e('Session processing error:', err);
        }

        // Note: Session acknowledgment is now handled directly in the processing loop above
    });

    //Session updates processing
    plugins.register("/aggregator", async function() {
        var writeBatcher = new WriteBatcher(common.db);

        const sessionUpdateSource = new UnifiedEventSource('session-update-aggregator', {
            mongo: {
                db: common.drillDb,
                pipeline: [
                    {"$match": {"operationType": "update"}},
                    {"$addFields": {"__id": "$fullDocument._id", "cd": "$fullDocument.cd"}}
                ],
                fallback: {
                    pipeline: [{"$match": {"e": {"$in": ["[CLY]_session"]}}}],
                    "timefield": "lu"
                },
                options: {fullDocument: "updateLookup"},
                collection: "drill_events",
                onClose: async function(callback) {
                    await common.writeBatcher.flush("countly", "users");
                    if (callback) {
                        callback();
                    }
                }
            }
        });

        // Process session updates using async iterator pattern
        try {
            for await (const { token, events } of sessionUpdateSource) {
                if (events && Array.isArray(events)) {
                    // Process each session update event in the batch - PROPERLY AWAIT EACH ONE
                    for (const data of events) {
                        var next = data;
                        // Handle changestream format differences
                        if (data && data.fullDocument) {
                            next = data.fullDocument;
                        }

                        if (next && next.a && next.e && next.e === "[CLY]_session" && next.n && next.ts) {
                            try {
                                // Convert callback to Promise and await it
                                const app = await new Promise((resolve, reject) => {
                                    common.readBatcher.getOne("apps", common.db.ObjectID(next.a), function(err, appResponse) {
                                        if (err) {
                                            reject(err);
                                        }
                                        else {
                                            resolve(appResponse);
                                        }
                                    });
                                });

                                if (app) {
                                    var dur = next.dur || 0;
                                    // For changestream updates, check updateDescription
                                    if (data && data.updateDescription && data.updateDescription.updatedFields && data.updateDescription.updatedFields.dur) {
                                        dur = data.updateDescription.updatedFields.dur;
                                    }
                                    usage.processSessionDurationRange(writeBatcher, token, dur, next.did, {
                                        "app_id": next.a,
                                        "app": app,
                                        "time": common.initTimeObj(app.timezone, next.ts),
                                        "appTimezone": (app.timezone || "UTC")
                                    });
                                }
                            }
                            catch (err) {
                                log.e("Error getting app data for session update", err);
                                // Continue processing other events in batch
                            }
                        }
                    }
                }
                // Note: Auto-acknowledgment happens when iterator moves to next batch
            }
        }
        catch (err) {
            log.e('Session update processing error:', err);
        }

        // Note: Session update acknowledgment is now handled directly in the processing loop above
    });


    /** 
    * Set Plugins APIs Config
    */
    //Put in single file outside(all set configs)
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

    // plugins.init(); - should run new init ingestor

    /**
    *  Trying to gracefully handle the batch state
    *  @param {number} code - error code
    */
    async function storeBatchedData(code) {
        try {
            await common.writeBatcher.flushAll();
            await common.secondaryWriteBatcher.flushAll();
            // await common.insertBatcher.flushAll();
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
            plugins.dispatch("/aggregator/exit");
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
        plugins.dispatch("/aggregator/exit");
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
    console.log("Starting aggregator", process.pid);
    //since process restarted mark running tasks as errored


    plugins.init({"skipDependencies": true, "filename": "aggregator"});
    plugins.loadConfigs(common.db, function() {
        plugins.dispatch("/aggregator", {common: common});
    });
});


/**
 * On incoming request
 * 1)Get App data (Batcher)
 * 2)Get overall configs
 * 
 */