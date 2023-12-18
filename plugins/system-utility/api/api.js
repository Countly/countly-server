var plugin = {},
    common = require('../../../api/utils/common.js'),
    tracker = require('../../../api/parts/mgmt/tracker.js'),
    plugins = require('../../pluginManager.js'),
    systemUtility = require('./system.utility'),
    log = common.log('system-utility:api'),
    cluster = require("cluster");

const processName = (cluster.isMaster ? "master" : "worker") + "-" + process.pid;
const profilerCmds = ["startProfiler", "stopProfiler", "startInspector", "stopInspector"];
let numberOfWorkers;

function isInspectorMessage(msg) {
    return typeof msg === "object" && profilerCmds.includes(msg.cmd);
}

/**
 * Handles IPC messages sent by profiler and inspector endpoints.
 * @param {object} msg should contain at least "cmd" and "msgId" key
 * @returns {Promise<mixed>}
 */
function handleMessage(msg) {
    if (isInspectorMessage(msg)) {
        let args = msg.args || [];
        // each process will have their own processName. So we can't pass
        // that from the main process:
        if (msg.cmd === "stopProfiler" || msg.cmd === "startProfiler") {
            args = [processName];
        }

        systemUtility[msg.cmd](...args).catch(err => {
            log.e(err);
            console.error(err);
        });
    } else if (typeof msg === "object" && msg.cmd === "setNumberOfWorkers") {
        numberOfWorkers = msg.params.numberOfWorkers;
    }
}

// Handle messages broadcasted from master to worker.
process.on("message", msg => handleMessage(msg));

// Handle messages sent from worker to master.
plugins.register("/master", () => {
    const workers = Object.values(cluster.workers);

    workers.forEach(worker => {
        // set the numberOfWorkers variable on each worker
        worker.on("listening", () => {
            worker.send({
                cmd: "setNumberOfWorkers",
                params: { numberOfWorkers: workers.length }
            });
        });

        // listen workers for inspector/profiler messages
        worker.on("message", msg => {
            if (isInspectorMessage(msg)) {
                // handle on master
                handleMessage(msg);

                // broadcast to all workers except for "startInspector".
                // running startInspector on master also starts worker's inspectors.
                if (!["startInspector"].includes(msg.cmd)) {
                    workers.forEach(worker => worker.send(msg));
                }
            }
        });
    });
});

// helper functions to start/stop with a timeout.
let timeouts = { Profiler: null, Inspector: null };
function startWithTimeout(type) {
    if (timeouts[type]) {
        throw new Error("Already started");
    }
    process.send({ cmd: "start" + type });
    timeouts[type] = setTimeout(() => stopWithTimeout(type, true), 2 * 60 * 60 * 1000);
}
function stopWithTimeout(type, fromTimeout = false) {
    if (!timeouts[type]) {
        throw new Error(type + " needs to be started");
    }
    process.send({ cmd: "stop" + type });
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
        
        switch(path) {
        case "start":
            validate(params, () => {
                const masterPort = common.config?.api?.masterInspectorPort ?? 9229;
                try {
                    startWithTimeout("Inspector");
                    common.returnMessage(params, 200, {
                        workers: numberOfWorkers,
                        ports: [masterPort, masterPort + numberOfWorkers]
                    });
                } catch(err) {
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
                } catch(err) {
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
                } catch(err) {
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
                } catch(err) {
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
                        common.returnMessage(params, 404, "Profiler files not found");
                    });
            });
            return true;

        case 'download':
            validate(params, () => {
                systemUtility.downloadProfilerFile(params.qstring.filename)
                    .then(({ data, filename }) => {
                        common.returnRaw(params, 200, data, {
                            'Content-Type': 'plain/text; charset=utf-8',
                            'Content-disposition': 'attachment; filename=' + filename 
                        });
                    })
                    .catch(err => {
                        log.e(err);
                        common.returnMessage(params, 404, "File not found");
                    });
            });
            return true;
        
        case 'download-all':
            validate(params, async () => {
                try {
                    const tarStream = await systemUtility.profilerFilesTarStream();
                    params.res.writeHead(200, {
                        "Content-Type": "plain/text; charset=utf-8",
                        "Content-Disposition": "attachment; filename=profiler.tar"
                    });
                    tarStream.on("end", () => params.res.end());
                    tarStream.pipe(params.res);
                } catch(err) {
                    log.e(err);
                    console.error(err);
                    common.returnMessage(params, 500, "Server error");
                }
            })
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

    plugins.register("/master", function() {
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
    });
}(plugin));

module.exports = plugin;