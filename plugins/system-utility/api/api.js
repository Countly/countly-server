var plugin = {},
    common = require('../../../api/utils/common.js'),
    //tracker = require('../../../api/parts/mgmt/tracker.js'),
    plugins = require('../../pluginManager.ts'),
    systemUtility = require('./system.utility'),
    log = common.log('system-utility:api');

const processName = "master-" + process.pid;
const profilerCmds = ["startProfiler", "stopProfiler", "startInspector", "stopInspector"];

/**
 * Checks if the message is sent from profiler/inspector endpoints
 * @param {object} msg IPC message object contains a "cmd" key
 * @returns {boolean} true if an inspector/profiler message
 */
function isInspectorMessage(msg) {
    return typeof msg === "object" && profilerCmds.includes(msg.cmd);
}

/**
 * Handles messages sent by profiler and inspector endpoints.
 * @param {object} msg should contain at least "cmd" key
 */
function handleMessage(msg) {
    if (isInspectorMessage(msg)) {
        let args = msg.args || [];
        // Set processName for profiler commands
        if (msg.cmd === "stopProfiler" || msg.cmd === "startProfiler") {
            args = [processName];
        }
        systemUtility[msg.cmd](...args).catch(err => log.e(err));
    }
}

// helper functions to start/stop with a timeout.
let timeouts = { Profiler: null, Inspector: null };
/**
 * Starts Inspector or Profiler with a timeout
 * @param {string} type Inspector|Profiler
 */
function startWithTimeout(type) {
    if (timeouts[type]) {
        throw new Error("Already started");
    }
    handleMessage({ cmd: "start" + type });
    timeouts[type] = setTimeout(() => stopWithTimeout(type, true), 2 * 60 * 60 * 1000);
}

/**
 * Stops Inspector or Profiler
 * @param {string} type Inspector|Profiler
 * @param {boolean} fromTimeout true if its being stopped because of the timeout
 */
function stopWithTimeout(type, fromTimeout = false) {
    if (!timeouts[type]) {
        throw new Error(type + " needs to be started");
    }
    handleMessage({ cmd: "stop" + type });
    if (!fromTimeout) {
        clearTimeout(timeouts[type]);
    }
    timeouts[type] = null;
}

(function() {
    plugins.register("/i/inspector", function(ob) {
        var params = ob.params,
            path = ob.paths[3].toLowerCase(),
            validate = ob.validateUserForGlobalAdmin;

        switch (path) {
        case "start":
            validate(params, () => {
                const masterPort = common.config?.api?.masterInspectorPort ?? 9229;
                try {
                    startWithTimeout("Inspector");
                    common.returnMessage(params, 200, {
                        ports: [masterPort]
                    });
                }
                catch (err) {
                    log.e(err);
                    common.returnMessage(params, 500, err.toString());
                }
            });
            return true;

        case "stop":
            validate(params, () => {
                try {
                    stopWithTimeout("Inspector");
                    common.returnMessage(params, 200, "Stoping inspector for all processes");
                }
                catch (err) {
                    log.e(err);
                    common.returnMessage(params, 500, err.toString());
                }
            });
            return true;

        default:
            return false;
        }
    });

    plugins.register("/i/profiler", function(ob) {
        var params = ob.params,
            path = ob.paths[3].toLowerCase(),
            validate = ob.validateUserForGlobalAdmin;

        switch (path) {
        case 'start':
            validate(params, () => {
                try {
                    startWithTimeout("Profiler");
                    common.returnMessage(params, 200, "Starting profiler for all processes");
                }
                catch (err) {
                    log.e(err);
                    common.returnMessage(params, 500, err.toString());
                }
            });
            return true;

        case 'stop':
            validate(params, () => {
                try {
                    stopWithTimeout("Profiler");
                    common.returnMessage(params, 200, "Stoping profiler for all processes");
                }
                catch (err) {
                    log.e(err);
                    common.returnMessage(params, 500, err.toString());
                }
            });
            return true;

        case "take-heap-snapshot":
            validate(params, async() => {
                try {
                    params.res.writeHead(200, {
                        "Content-Type": "plain/text; charset=utf-8",
                        "Content-Disposition": "attachment; filename=heap.heapsnapshot"
                    });
                    systemUtility.takeHeapSnapshot(params.res);
                }
                catch (err) {
                    log.e(err);
                    common.returnMessage(params, 500, err.toString());
                }
            });
            return true;

        case 'list-files':
            validate(params, () => {
                systemUtility.listProfilerFiles()
                    .then(res => common.returnMessage(params, 200, res))
                    .catch(err => {
                        log.e(err);
                        common.returnMessage(params, 404, "Profiler files couldn't be found");
                    });
            });
            return true;

        case 'download-all':
            validate(params, async() => {
                try {
                    const tarStream = await systemUtility.profilerFilesTarStream();
                    if (tarStream === null) {
                        common.returnMessage(params, 404, "Profiler files couldn't be found");
                    }
                    else {
                        params.res.writeHead(200, {
                            "Content-Type": "plain/text; charset=utf-8",
                            "Content-Disposition": "attachment; filename=profiler.tar"
                        });
                        tarStream.on("end", () => params.res.end());
                        tarStream.pipe(params.res);
                    }
                }
                catch (err) {
                    log.e(err);
                    common.returnMessage(params, 500, err.toString());
                }
            });
            return true;

        default:
            return false;
        }
    });



    plugins.register("/o/system", function(ob) {

        var params = ob.params,
            path = ob.paths[3].toLowerCase(),
            qstring = ob.params.qstring,
            validate = ob.validateUserForGlobalAdmin;

        switch (path) {
        case 'memory':
        case 'disks':
        case 'cpu':
        case 'database':
        case 'overall':
        case "healthcheck":
        case "dbcheck":
            validate(params, () => {
                systemUtility[path](qstring)
                    .then(
                        res => common.returnMessage(params, 200, res),
                        res => common.returnMessage(params, 500, res)
                    );
            });
            return true;
        default:
            return false;
        }


    });

    /*plugins.register("/master", function() {
        //ping server stats periodically
        if (tracker.isEnabled()) {
            var timeout = 1000 * 60 * 15;
            var getServerStats = function() {
                Promise.all([systemUtility.memory(), systemUtility.disks(), systemUtility.cpu(), systemUtility.database(), systemUtility.dbcheck()].map(p => p.catch(() => null))).then(function(values) {
                    var sdk = tracker.getSDK();
                    //track ram
                    var ram = values[0];
                    if (ram && ram.details) {
                        var id;
                        for (let i = 0; i < ram.details.length; i++) {
                            if (ram.details[i].id !== "-/+") {
                                id = ram.details[i].id;
                                sdk.userData.set(id, {
                                    total: Math.ceil(parseFloat(ram.details[i].total) / 1024),
                                    free: Math.round(parseFloat(ram.details[i].free) / 1024),
                                    used: Math.round(parseFloat(ram.details[i].used) / 1024),
                                    usage: parseFloat(ram.details[i].usage).toFixed(2)
                                });
                            }
                        }
                    }
                    //track disks
                    var disks = values[1];
                    if (disks && disks.details) {
                        for (let i = 0; i < disks.details.length; i++) {
                            sdk.userData.set("disk_" + i, {
                                path: disks.details[i].id,
                                total: Math.ceil(parseFloat(disks.details[i].total) / 1024 / 1024 / 1024),
                                free: Math.round(parseFloat(disks.details[i].free) / 1024 / 1024 / 1024),
                                used: Math.round(parseFloat(disks.details[i].used) / 1024 / 1024 / 1024),
                                usage: parseFloat(disks.details[i].usage).toFixed(2)
                            });
                        }
                    }

                    //track db disks
                    var cpu = values[2];
                    if (cpu && cpu.overall) {
                        sdk.userData.set("cpu_usage", parseFloat(cpu.overall.usage).toFixed(2));
                    }

                    //track db disks
                    disks = values[3];
                    if (disks && disks.details) {
                        for (let i = 0; i < disks.details.length; i++) {
                            sdk.userData.set("disk_db" + i, {
                                total: Math.ceil(parseFloat(disks.details[i].total) / 1024 / 1024 / 1024),
                                free: Math.round(parseFloat(disks.details[i].free) / 1024 / 1024 / 1024),
                                used: Math.round(parseFloat(disks.details[i].used) / 1024 / 1024 / 1024),
                                usage: parseFloat(disks.details[i].usage).toFixed(2)
                            });
                        }
                    }

                    sdk.userData.set("db_connection", values[3] ? true : false);
                    sdk.userData.save();
                    setTimeout(getServerStats, timeout);
                }, function() {
                    setTimeout(getServerStats, timeout);
                });
            };
            getServerStats();
        }
    });*/
}(plugin));

module.exports = plugin;