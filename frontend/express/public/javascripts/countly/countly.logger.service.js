/* eslint-disable no-console */
/* global countlyIndexedDbService,Promise*/
(function(countlyLoggerService) {

    var LoggerLevelEnum = Object.freeze({
        DEBUG: "debug",
        INFO: "info",
        WARN: "warn",
        ERROR: "error"
    });

    var LOGGER_STORE = "client_logger";

    // Note: create client logger store when user session starts.
    countlyIndexedDbService.createStore(LOGGER_STORE);
    // Note: clear client logger store when user session starts.
    countlyIndexedDbService.clearStore(LOGGER_STORE);

    var LoggerHelper = {
        getLogEntry: function(level, label, entry, location, method) {
            var result = {
                level: level,
                label: label,
                log: entry,
            };
            if (location) {
                result.location = location;
            }
            if (method) {
                result.method = method + "()";
            }
            if (entry instanceof Error) {
                result.log = entry;
                return result;
            }
            result.log = JSON.stringify(entry);
            return result;
        },
        // getLogEntryStringFormat: function(level, timestamp, label, entry, location, method) {
        //     var stringFormat = new Date(timestamp).toISOString() + " " + (level + "/" + label);
        //     if (location) {
        //         stringFormat = stringFormat.concat(", at " + location);
        //     }
        //     if (method) {
        //         stringFormat = stringFormat.concat("." + method + "()");
        //     }
        //     stringFormat = stringFormat.concat(": ");
        //     if (entry instanceof Error) {
        //         stringFormat = stringFormat.concat(entry);
        //         return stringFormat;
        //     }
        //     stringFormat = stringFormat.concat(JSON.stringify(entry));
        //     return stringFormat;
        // },
        saveFile: function(blob) {
            var downloadAnchor = document.createElement("a");
            downloadAnchor.href = URL.createObjectURL(blob);
            downloadAnchor.download = "Countly-client-logs-" + Date.now().valueOf() + ".log";
            setTimeout(function() {
                downloadAnchor.dispatchEvent(new MouseEvent("click"));
            }, 0);
        }
    };

    var LoggerFactory = function(label) {
        return {
            info: function(entry, location, method) {
                var timestamp = Date.now();
                // console.log("%c" + LoggerHelper.getLogEntryStringFormat(LoggerLevelEnum.INFO, timestamp, label, entry, location, method), "color:" + INFO_LOG_COLOR);
                countlyIndexedDbService.setItem(LOGGER_STORE, timestamp.toString(), LoggerHelper.getLogEntry(LoggerLevelEnum.INFO, label, entry, location, method));
            },
            error: function(entry, location, method) {
                var timestamp = Date.now();
                // console.error("%c" + LoggerHelper.getLogEntryStringFormat(LoggerLevelEnum.ERROR, timestamp, label, entry, location, method), "color:" + ERROR_LOG_COLOR);
                countlyIndexedDbService.setItem(LOGGER_STORE, timestamp.toString(), LoggerHelper.getLogEntry(LoggerLevelEnum.ERROR, label, entry, location, method));
            },
            debug: function(entry, location, method) {
                var timestamp = Date.now();
                // console.debug("%c" + LoggerHelper.getLogEntryStringFormat(LoggerLevelEnum.DEBUG, timestamp, label, entry, location, method), "color:" + DEBUG_LOG_COLOR);
                countlyIndexedDbService.setItem(LOGGER_STORE, timestamp.toString(), LoggerHelper.getLogEntry(LoggerLevelEnum.DEBUG, label, entry, location, method));
            }
        };
    };

    var LoggerService = {
        loggers: {},
        getLogs: function() {
            return new Promise(function(resolve, reject) {
                countlyIndexedDbService.getItems(LOGGER_STORE).then(function(logEntries) {
                    var allLogEntries = logEntries.map(function(item) {
                        var timestamp = parseInt(item.key);
                        var level = item.value.level;
                        var label = item.value.label;
                        var log = item.value.log;
                        var location = item.value.location;
                        var method = item.value.method;
                        var logLine = new Date(timestamp).toISOString() + " " + level + "/" + label;
                        if (location) {
                            logLine = logLine.concat(", at " + location);
                        }
                        if (method) {
                            logLine = logLine.concat("." + method);
                        }
                        logLine = logLine.concat(": " + log + "\n");
                        if (log.stack) {
                            logLine = logLine.concat(log.stack + "\n");
                        }
                        return logLine;
                    });
                    resolve(allLogEntries.join(""));
                }).catch(function(error) {
                    reject(error);
                });
            });
        },
        export: function() {
            var self = this;
            return new Promise(function(resolve, reject) {
                self.getLogs().then(function(entries) {
                    var logsBlob = new Blob([entries], { type: "text/plain;charset=utf-8" });
                    resolve();
                    LoggerHelper.saveFile(logsBlob);
                }).catch(function(error) {
                    reject(error);
                });
            });
        },
        clear: function() {
            return countlyIndexedDbService.clearStore(LOGGER_STORE);
        },
        createCategory: function(name) {
            if (this.loggers[name]) {
                return this.loggers[name];
            }
            var logger = LoggerFactory(name);
            this.loggers[name] = logger;
            return logger;
        },
        levelEnum: LoggerLevelEnum,
    };
    Object.assign(countlyLoggerService, LoggerService);

}(window.countlyLoggerService = window.countlyLoggerService || {}));