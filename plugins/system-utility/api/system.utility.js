var common = require('../../../api/utils/common.js');
const inspector = require('inspector');
const countlyFs = require('../../../api/utils/countlyFs.js');
var exec = require('child_process').exec;
const tar = require("tar-stream");
const session = new inspector.Session();

const PROFILER_DIR = "nodeprofile";

var _id = null;

// SYSTEM
/**
 * Getting System unique ID
 * @returns {object} - Promise
 */
function getSystemID() {
    return new Promise((resolve, reject) => {
        if (_id === null) {
            exec('sudo cat /sys/class/dmi/id/product_uuid', (error, stdout, stderr) => {
                if (error) {
                    reject(stderr);
                    return;
                }
                _id = stdout.trim();
                resolve(_id);
            });
        }
        else {
            resolve(_id);
        }
    });
}

exports.id = getSystemID;
exports.platform = process.platform;

// CPU
/**
 * Get CPU info
 * @returns {object} - Promise
 */
function getCPU() {
    return new Promise((resolve, reject) => {
        exec('cat /proc/stat', (error, stdout, stderr) => {
            if (error) {
                return reject(stderr);
            }

            var lines = stdout.trim().split("\n").filter(x => x.startsWith("cpu"));

            var cpuOveralValues = lines.splice(0, 1)[0].replace(/[\s\n\r]+/g, ' ').split(' ');
            cpuOveralValues = cpuOveralValues.splice(1, cpuOveralValues.length);
            var response = {
                total: cpuOveralValues.map(x => parseInt(x)).reduce((prev, current) => prev + current, 0),
                idle: parseInt(cpuOveralValues[3]),
                details: []
            };

            response.details = lines
                .map(line => line.replace(/[\s\n\r]+/g, ' ').split(' '))
                .map(values => {
                    var id = values.splice(0, 1)[0];
                    values = values.map(x => parseInt(x));
                    return {
                        id: id,
                        total: values.reduce((prev, current) => (prev + current), 0),
                        idle: values[3]
                    };
                });

            resolve(response);
        });
    });
}

/**
 * Get CPU Usage info
 * @returns {object} - Promise
 */
function cpuUsage() {
    return new Promise((resolve, reject) => {
        getCPU().then(startInfo => {

            setTimeout(() => {
                getCPU().then(endInfo => {
                    var cpus = [];

                    for (var i = 0; i < endInfo.details.length; i++) {
                        var cpuAtStart = startInfo.details[i];
                        var cpuAtEnd = endInfo.details[i];

                        var cpuIdleDiff = cpuAtEnd.idle - cpuAtStart.idle;
                        var cpuTotalDiff = cpuAtEnd.total - cpuAtStart.total;

                        var cpuInfo = {
                            id: cpuAtEnd.id,
                            usage: 100 - ((cpuIdleDiff / cpuTotalDiff) * 100),
                            total: cpuTotalDiff,
                            free: cpuIdleDiff,
                            used: cpuTotalDiff - cpuIdleDiff,
                            units: 'Difference'
                        };
                        cpus.push(cpuInfo);
                    }

                    // calculate total usage
                    var idle = endInfo.idle - startInfo.idle;
                    var total = endInfo.total - startInfo.total;

                    var response = {
                        overall: {
                            usage: 100 - ((idle / total) * 100)
                        },
                        details: cpus
                    };

                    resolve(response);
                }, err => reject(err));
            }, 1000);

        }, err => reject(err));
    });
}

exports.cpu = cpuUsage;

// MEMORY
/**
 * Get memory usage
 * @returns {object} - Promise
 */
function memoryUsage() {
    return new Promise((resolve, reject) => {
        exec('free', (error, stdout, stderr) => {
            if (error) {
                return reject(stderr);
            }
            var lines = stdout.trim().split("\n").reverse();

            lines.pop();

            var details = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                line = line.replace(/[\s\n\r]+/g, ' ').replace(":", '').split(' ');
                if (line[0].toLowerCase() !== "-/+") {
                    details.push({
                        id: line[0].toLowerCase(),
                        usage: ((100 * line[2]) / line[1]) || 0,
                        total: line[1],
                        used: line[2],
                        free: line[1] - line[2],
                        units: "Byte"
                    });
                }
            }

            var response = {
                overall: {
                    usage: details.reduce((prev, current) => current.usage, 0) / details.length
                },
                details: details
            };
            resolve(response);

        });
    });
}

exports.memory = memoryUsage;

// DISKS
/**
 * Set disk recursive function
 * @param {Array} disks - Disk list
 * @param {number} index - Current iterator
 * @param {function} callback - Callback
 */
function setDiskIds(disks, index, callback) {
    if (disks.length === index) {
        callback(null, disks);
        return;
    }

    var currentDisk = disks[index];
    currentDisk.id = currentDisk.fileSystem.toLowerCase();
    delete currentDisk.fileSystem;
    setDiskIds(disks, index + 1, callback);
}

/**
 * Disk usage
 * @returns {object} - Promise
 */
function disksUsage() {
    var result = {};
    result.total = 0;
    result.used = 0;
    result.free = 0;
    result.status = null;

    return new Promise((resolve, reject) => {
        exec("df -x tmpfs -x devtmpfs", (error, stdout, stderr) => {
            if (error) {
                console.error(stderr);
                reject(stderr);
            }
            else {
                var lines = stdout.trim().split("\n").reverse();
                lines.pop();
                var disks = [];

                var totalSize = 0, totalUsed = 0;
                for (var i = 0; i < lines.length; i++) {
                    var str_disk_info = lines[i].replace(/[\s\n\r]+/g, ' ');
                    var disk_info = str_disk_info.split(' ');
                    if (disk_info[0] && !(disk_info[0] + "").startsWith("/dev/loop") && !(disk_info[5] + "").startsWith("/boot")) {
                        result = {};
                        result.fileSystem = disk_info[0];
                        result.usage = (disk_info[2] / disk_info[1]) * 100;
                        result.total = disk_info[1] * 1024; //Kb to Byte
                        result.used = disk_info[2] * 1024;
                        result.free = result.total - result.used;
                        result.units = "Byte";
                        totalSize += result.total;
                        totalUsed += result.used;
                        disks.push(result);
                    }
                }

                setDiskIds(disks, 0, (err, res) => {
                    if (err) {
                        reject(err);
                    }
                    else {

                        var response = {
                            overall: {
                                usage: (100 * totalUsed) / totalSize
                            },
                            details: res
                        };
                        resolve(response);
                    }
                });
            }
        });
    });
}

exports.disks = disksUsage;

// DATABASE
/**
 * Database usage
 * @returns {object} - Promise
 */
function dbUsage() {
    return new Promise((resolve, reject) => {
        common.db.command({ dbStats: 1, scale: 1 }, (err, result) => {
            if (err) {
                return reject(err);
            }

            var used = result.fsUsedSize;
            var total = result.fsTotalSize;
            var usage = (used / total) * 100;

            var response = {
                overall: {
                    usage: usage || 0
                },
                details: [
                    {
                        id: "db",
                        usage: usage || 0,
                        total: result.fsTotalSize || 0,
                        used: result.fsUsedSize || 0,
                        free: (result.fsTotalSize - result.fsUsedSize) || 0,
                        units: "Byte"
                    }
                ]
            };

            resolve(response);
        });
    });
}

exports.database = dbUsage;

// OVERALL
/**
 * Overall system info
 * @returns {object} - Promise
 */
function getOverallInfo() {
    var systemId = getSystemID();
    var cpu = cpuUsage();
    var memory = memoryUsage();
    var disks = disksUsage();
    var database = dbUsage();

    return new Promise((resolve, reject) => {
        Promise.all([systemId, cpu, memory, disks, database]).then(values => {
            resolve({
                id: values[0],
                platform: process.platform,
                cpu: values[1],
                memory: values[2],
                disks: values[3],
                database: values[4]
            });
        }, err => reject(err));
    });
}

exports.overall = getOverallInfo;

// HEALTH CHECK
/**
 * Switch condition
 * @param {string} condition - Condition
 * @param {string} sourceValue - Source
 * @param {string} targetValue - Target
 * @return {boolean} - Result
 */
function checkCondition(condition, sourceValue, targetValue) {
    switch (condition) {
    case "$lte":
        return sourceValue <= targetValue;
    case "$lt":
        return sourceValue < targetValue;
    case "$gte":
        return sourceValue >= targetValue;
    case "$gt":
        return sourceValue > targetValue;
    case "$eq":
        return sourceValue === targetValue;
    default:
        return false;
    }
}

/**
 * Health check
 * @param {object} qstring - Query string
 * @returns {object} - Promise
 */
function healthCheck(qstring) {
    return new Promise((resolve, reject) => {
        this.overall().then(overall => {
            var testFilter = {};
            try {
                testFilter = JSON.parse(qstring.test);
            }
            catch (error) {
                return reject(error);
            }

            var response = true;
            Object.keys(testFilter).forEach(key => {
                var subKeys = key.split('.');
                var filter = testFilter[key];

                var valueOfKey = subKeys.reduce((obj, subKey) => {
                    return (obj && obj[subKey] !== 'undefined') ? obj[subKey] : null;
                }, overall);

                Object.keys(filter).forEach(filterKey => {
                    if (checkCondition(filterKey, valueOfKey, filter[filterKey]) === false) {
                        response = false;
                    }
                });
            });
            if (response) {
                resolve(response);
            }
            else {
                reject(response);
            }
        }, err => reject(err));
    });
}

/**
 * MongoDB Connection check
 * @returns {object} - Promise
 */
function mongodbConnectionCheck() {
    return new Promise((resolve, reject) => {
        common.db.collection("plugins").findOne({ _id: "plugins" }, { _id: 1 }, (err) => {
            if (err) {
                reject(false);
            }
            else {
                resolve(true);
            }
        });
    });
}


exports.healthcheck = healthCheck;
exports.dbcheck = mongodbConnectionCheck;

// PROFILER

/**
 * Promise abstraction for session.post
 * @param {string} cmd session command to run
 * @returns {Promise<mixed>} the value command returns
 */
const sessionPost = function(cmd) {
    return new Promise((res, rej) => {
        session.post(cmd, (err, arg) => {
            if (err) {
                return rej(err);
            }
            return res(arg);
        });
    });
}
/**
 * Saves the result to gridfs
 * @param {string} filename
 * @param {object} result result object returned by the profiler
 * @returns {Promise<string>} filename
 */
const saveProfilerResult = function(filename, result) {
    return new Promise((res, rej) => {
        countlyFs.gridfs.saveData(
            PROFILER_DIR, filename, JSON.stringify(result),
            { writeMode: "overwrite" },
            function(err) {
                if (err) return rej(err);
                res(filename);
            }
        );
    });
}

/**
 * Connects to inspector session and starts profilers
 * There're 3 types of profiler: cpu, heap, coverage
 * @returns {Promise<void>}
 */
async function startProfiler() {
    session.connect();

    await sessionPost("Profiler.enable");
    await sessionPost("Profiler.start");
    await sessionPost("Profiler.startPreciseCoverage");

    await sessionPost("HeapProfiler.enable");
    await sessionPost("HeapProfiler.startSampling");
}

/**
 * Stops profiler and disconnects from the inspector session
 * Files to be created:
 *  - process-name.cpuprofile
 *  - process-name.heapprofile
 *  - process-name.coverage
 * @returns {Promise<void>}
 */
async function stopProfiler(processName) {
    const errors = [];

    // clear old files
    await new Promise(
        (res, rej) => countlyFs.gridfs.deleteAll(
            PROFILER_DIR,
            null,
            err => err ? rej(err) : res()
        )
    )

    // coverage
    try {
        const coverage = await sessionPost("Profiler.takePreciseCoverage");
        await saveProfilerResult(processName + ".coverage", coverage?.result);
        await sessionPost("Profiler.stopPreciseCoverage");
    } catch(err) {
        errors.push(err);
    }

    // cpu profiler
    try {
        const cpuProfile = await sessionPost("Profiler.stop");
        await saveProfilerResult(processName + ".cpuprofile", cpuProfile?.profile);
        await sessionPost("Profiler.disable");
    } catch(err) {
        errors.push(err);
    }
    
    // heap profiler
    try {
        const heapProfile = await sessionPost("HeapProfiler.stopSampling");
        await saveProfilerResult(processName + ".heapprofile", heapProfile?.profile);
        await sessionPost("HeapProfiler.disable");
    } catch(err) {
        errors.push(err);
    }

    session.disconnect();

    if (errors.length) {
        throw errors;
    }
}

/**
 * Returns the data of a file in PROFILER_DIR collection
 * @param {string} filename
 * @returns {Promise<{data:string, filename:string}>}
 */
function downloadProfilerFile(filename) {
    return new Promise((resolve, reject) => {
        countlyFs.gridfs.getData(PROFILER_DIR, filename, {}, (err, data) => {
            if (err) {
                return reject("File not found");
            }
            resolve({ data, filename });
        });
    });
}
/**
 * Returns the names and creation dates of all files in the PROFILER_DIR collection
 * @returns {Promise<Array<{createdOn:Date, filename:string}>>}
 */
function listProfilerFiles() {
    return new Promise((resolve, reject) => {
        countlyFs.gridfs.listFiles(PROFILER_DIR, (err, files) => {
            if (err) {
                return reject(err);
            }
            resolve(files);
        });
    });
}

/**
 * Returns the tarball read stream for all profiler files
 * @returns {tar.Pack}
 */
async function profilerFilesTarStream() {
    const files = await listProfilerFiles();
    let fileStreamFinished = 0;
    if (!files.length) {
        return null;
    }
    const pack = tar.pack();
    for (let i = 0; i < files.length; i++) {
        const entry = pack.entry({ name: files[i].filename, size: files[i].size });
        const stream = await new Promise((res, rej) => {
            countlyFs.gridfs.getStream(
                PROFILER_DIR,
                files[i].filename,
                {},
                (err, fileStream) => err ? rej(err) : res(fileStream)
            )
        });
        stream.pipe(entry);
        stream.on("end", () => {
            entry.end();
            if (++fileStreamFinished === files.length) {
                pack.finalize();
            }
        });
    }
    return pack;
}

/**
 * Opens inspector. Running inspector.open on master process triggers workers to
 * open their inspector also. But this is not the case for closing the inspectors.
 * Each worker needs to be closed manually.
 * @returns {void}
 */
function startInspector() {
    return new Promise((res, rej) => {
        try {
            res(inspector.open());
        } catch(err) {
            rej(err);
        }
    });
}

/**
 * Closes inspector. Running inspector.close on master doesn't trigger workers to
 * close their inspector. Each worker needs to be closed manually.
 * @returns {void}
 */
function stopInspector() {
    return new Promise((res, rej) => {
        try {
            res(inspector.close());
        } catch(err) {
            rej(err);
        }
    });
}

exports.startProfiler = startProfiler;
exports.stopProfiler = stopProfiler;
exports.downloadProfilerFile = downloadProfilerFile;
exports.listProfilerFiles = listProfilerFiles;
exports.startInspector = startInspector;
exports.stopInspector = stopInspector;
exports.profilerFilesTarStream = profilerFilesTarStream;
