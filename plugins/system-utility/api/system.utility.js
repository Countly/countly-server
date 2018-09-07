var common = require('../../../api/utils/common.js');
var exec = require('child_process').exec;

var _id = null;

// SYSTEM
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
function memoryUsage() {
    return new Promise((resolve, reject) => {
        exec('free', (error, stdout, stderr) => {
            if (error) {
                return reject(stderr);
            }
            var lines = stdout.trim().split("\n").reverse();

            lines.pop();

            var details = lines
                .map(line => line.replace(/[\s\n\r]+/g, ' ').split(' '))
                .map(line => {
                    return {
                        id: line[0].toLowerCase() === "mem" ? "physical" : line[0].toLowerCase(),
                        usage: ((100 * line[2]) / line[1]) || 0,
                        total: line[1],
                        used: line[2],
                        free: line[1] - line[2],
                        units: "Byte"
                    };
                });

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
function setDiskIds(disks, index, callback) {
    if (disks.length === index) {
        callback(null, disks);
        return;
    }

    var currentDisk = disks[index];
    exec('blkid ' + currentDisk.fileSystem, (error, stdout, stderr) => {
        if (error) {
            callback(stderr, null);
        }
        var str_disk_info = stdout.trim().replace(/[\s\n\r]+/g, ' ').split(' ');
        currentDisk.id = "(" + currentDisk.fileSystem.toUpperCase() + ")-" + str_disk_info[1].substring(6, str_disk_info[1].length - 1);
        delete currentDisk.fileSystem;
        setDiskIds(disks, index + 1, callback);
    });
}

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

                var valueOfKey = subKeys.reduce((obj, key) => {
                    return (obj && obj[key] !== 'undefined') ? obj[key] : null;
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