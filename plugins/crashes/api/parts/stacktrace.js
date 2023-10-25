/**
* Module to process stacktraces
* @module plugins/crashes/api/parts/stacktrace
*/
var minidump = require("./minidump.js");
var plugins = require("../../../pluginManager.js");

/** @lends module:plugins/crashes/api/parts/stacktrace */
var trace = {
    /**
     *  Parse threads from native stack trace
     *  @param {string} data - symbolized native stacktrace
     *  @return {array} with thread information
     */
    processNativeThreads: function(data) {
        var findCrash = /^Thread\s\d+\s\(crashed\)/gim;
        var rLineNumbers = /^\d+\s*/gim;
        var parts = data.split(findCrash);
        var stack = [];
        for (var i = 1; i < parts.length; i++) {
            parts[i] = parts[i].replace(/\r\n|\r|\n/g, "\n");
            parts[i] = parts[i].replace(/\t/g, "");
            parts[i] = parts[i].trim();
            stack.push((parts[i].split("\n")[0] + "").replace(rLineNumbers, ""));
        }
        return stack;
    },
    /**
     *  Parse threads from PL crash reported
     *  @param {string} data - PL Crash Report
     *  @return {array} with thread information
     */
    processPLCrashThreads: function(data) {
        var findCrash = /^Thread\s\d+\sCrashed:/gim;
        var rLineNumbers = /^\d+\s*/gim;
        var parts = data.split(findCrash);
        var stack = [];
        for (var i = 1; i < parts.length; i++) {
            parts[i] = parts[i].replace(/\r\n|\r|\n/g, "\n");
            parts[i] = parts[i].replace(/\t/g, "");
            parts[i] = parts[i].trim();
            stack.push((parts[i].split("\n")[0] + "").replace(rLineNumbers, ""));
        }
        return stack;
    },
    /**
     *  Prepare data for grouping stategy
     *  @param {Array} stack - processed stacktrace
     *  @param {Object} crash - crash object from API
     *  @param {Function} callback - callback where to provide data
     *  @param {Object} overrideSettings - app settings to override
     */
    groupStrategy: function(stack, crash, callback, overrideSettings) {
        var groupStrategy = plugins.getConfig("crashes", overrideSettings || {}, true).grouping_strategy;
        var seed = "";
        if (groupStrategy === "stacktrace") {
            seed = stack.join("\n");
        }
        else {
            //default grouping strategy for error_and_file
            seed = crash._name || stack[0];
            if (crash._name !== stack[0]) {
                seed += stack[0] || "";
            }
            else {
                seed += stack[1] || "";
            }
        }

        //seed cleanup
        if (plugins.getConfig("crashes", overrideSettings || {}, true).smart_preprocessing) {
            //remove stand alone numbers like ids (MongoServerError: cursor id 8983374575113418154 not found)
            seed = seed.replace(/(?<!\S)\d+(?!\S)/gim, "");

            //remove content between / / like regex values (SyntaxError: Invalid regular expression: /.*(2672960366.*/: Unterminated group)
            seed = seed.replace(/\/.*?\//gim, "");

            //remove object contents like (android.app.XyzException:  Context.method() did not then call  Service.method():Object{3e13d46 u14  com.example/.Service})
            seed = seed.replace(/\{.*?\}/gim, "");

            //remove protocol (http://test)
            seed = seed.replace(/[a-zA-Z]*.:\/\//gim, "/");

            //remove params (http://test/test?id=123)
            seed = seed.replace(/\?[^)\n]*/gim, "");

            //remove file paths
            seed = seed.replace(/\/(.*\/)/gim, "");

            //remove ports
            seed = seed.replace(/:[0-9]+/gim, "");

            //remove ipv4
            seed = seed.replace(/((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}/gim, "");

            //remove ipv6
            seed = seed.replace(/(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/gim, "");

            //remove additional custom provided regexes
            var regexes = (plugins.getConfig("crashes", overrideSettings || {}, true).smart_regexes || "").replace(/\r\n|\r|\n/g, "\n").split("\n");
            for (let i = 0; i < regexes.length; i++) {
                if (regexes[i] && regexes[i].length) {
                    try {
                        seed = seed.replace(new RegExp(regexes[i]), "gim");
                    }
                    catch (ex) {
                        console.log("Error in smart regex for crash", regexes[i], ex);
                    }
                }
            }
        }

        callback(seed);
    },
    /**
    * Process crash
    * @param {object} crash - Crash object
    * @param {function} callback - to be called when processing is done
    * @param {Object} overrideSettings - app settings to override
    */
    preprocessCrash: function(crash, callback, overrideSettings) {
        if (crash._native_cpp) {
            minidump.processMinidump(crash._error, function(err, data) {
                if (!err) {
                    crash._binary_crash_dump = crash._error;
                    crash._error = data;
                    var stack = trace.processNativeThreads(data);
                    crash._name = stack[0];
                    trace.groupStrategy(stack, crash, callback, overrideSettings);
                }
                else {
                    console.log("Can't symbolicate", err);
                    crash._binary_crash_dump = crash._error;
                    crash._error = "Unsymbolicated native crash";
                    crash._symbolication_error = err;
                    crash._unprocessed = true;
                    trace.groupStrategy([crash._error], crash, callback, overrideSettings);
                }
            });
        }
        else if (crash._plcrash) {
            let stack = trace.processPLCrashThreads(crash._error);
            let lines = crash._error.replace(/\r\n|\r|\n/g, "\n").split("\n");
            let parsingBinaryList = false;
            let firstBinary = true;
            var binary_check = {};
            try {
                for (let line = 0; line < lines.length; line++) {
                    if (lines[line].startsWith("Version:")) {
                        let parts = lines[line].split(":").pop().split("(");
                        crash._app_version = parts[0].trim();
                        crash._app_build = (parts[1] + "").split(")")[0].trim();
                    }
                    else if (lines[line].startsWith("Hardware Model:")) {
                        crash._device = lines[line].split(":").pop().trim();
                    }
                    else if (lines[line].startsWith("OS Version:")) {
                        crash._os_version = lines[line].split(":").pop().split("(")[0].trim().split(" ").pop();
                    }
                    else if (!crash._name && lines[line].startsWith("Application Specific Information:") && lines[line + 1]) {
                        let offset = 1;
                        if (lines[line + offset].startsWith("ProductBuildVersion:")) {
                            offset++;
                        }
                        if (lines[line + offset]) {
                            crash._name = lines[line + offset]
                                .replace("***", "")
                                .replace("UNCAUGHT EXCEPTION", "")
                                .replace("Terminating app due to uncaught exception", "")
                                .replace("reason: ", "")
                                .trim();
                        }
                    }
                    else if (lines[line].startsWith("Binary Images:")) {
                        crash._binary_images = {};
                        parsingBinaryList = true;
                    }
                    else if (lines[line] === "") {
                        parsingBinaryList = false;
                    }
                    else if (parsingBinaryList) {
                        let parts = lines[line].trim().replace(/\s\s+/g, ' ').split(" ");
                        if (parts.length === 7) {
                            if (!crash._architecture) {
                                crash._architecture = parts[4];
                            }
                            if (binary_check[parts[3].replace(/(^\+)/mg, '')]) {
                                crash._binary_images[parts[3].replace(/(^\+)/mg, '') + "-" + parts[0]] = {bn: parts[3].replace(/(^\+)/mg, ''), la: parts[0], id: parts[5].replace(/(^<|>$)/mg, '').toUpperCase().replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5")};
                                if (firstBinary) {
                                    firstBinary = false;
                                    crash._executable_name = parts[3].replace(/(^\+)/mg, '');
                                    crash._build_uuid = parts[5].replace(/(^<|>$)/mg, '').toUpperCase().replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, "$1-$2-$3-$4-$5");
                                }
                            }
                        }
                        else {
                            console.log("Incorrect binary line", lines[line]);
                        }
                    }
                    else if (/^([0-9]+)(\s+)(.+)(\s+)(.+)$/gm.test(lines[line])) {
                        let parts = lines[line].trim().replace(/\s\s+/g, ' ').split(" ");
                        binary_check[parts[1]] = true;
                    }
                }
                crash._binary_images = JSON.stringify(crash._binary_images);
            }
            catch (ex) {
                console.log("Problem parsing PLCrashReport", crash);
            }
            if (!crash._name) {
                crash._name = stack[0];
            }
            trace.groupStrategy(stack, crash, callback, overrideSettings);
        }
        else {
            crash._error = crash._error.replace(/\r\n|\r|\n/g, "\n");
            crash._error = crash._error.replace(/\t/g, "");
            crash._error = crash._error.trim();
            var error = crash._error;

            //there can be multiple stacks separated by blank line
            //use the first one
            error = error.split("\n\n")[0];

            if (crash._javascript || crash._not_os_specific) {
                let lines = error.split("\n");
                //remove internal nodejs calls
                lines = lines.filter(function(elem) {
                    return elem.indexOf("(internal/") === -1;
                });
                error = lines.join("\n");

                //remove protocol
                error = error.replace(/[a-zA-Z]*.:\/\//gim, "/");
                //remove params
                error = error.replace(/\?[^)\n]*/gim, "");
                //remove file paths
                error = error.replace(/\/(.*\/)/gim, "");
                //remove line numbers
                error = error.replace(/:[0-9]*:[0-9]*/gim, "");
            }
            else if (crash._os && crash._os.toLowerCase && crash._os.toLowerCase() === "ios") {
                if (!crash._cpu && crash._architecture) {
                    crash._cpu = crash._architecture;
                }

                var rLineNumbers = /^\d+\s*/gim;
                crash._error = crash._error.replace(rLineNumbers, "");
                error = crash._error;

                var rHex = /0x([0-9A-F]*)\s/gim;
                var rPlus = /\s\+\s([0-9]*)$/gim;
                error = error.replace(rHex, "0x%%%%%% ").replace(rPlus, " + ");
            }
            else if (crash._os && crash._os.toLowerCase && crash._os.toLowerCase() === "android") {
                let lines = error.split("\n");
                //remove internal calls
                lines = lines.filter(function(elem) {
                    return elem.indexOf("at android.") === -1 && elem.indexOf("at com.android.") === -1 && elem.indexOf("at java.lang.") === -1;
                });
                error = lines.join("\n");

                //remove line numbers
                error = error.replace(/:[0-9]*/gim, "");
            }

            //remove same lines for recursive overflows (on different devices may have different amount of internal calls)
            //removing duplicates will result in same stack on different devices
            let lines = error.split("\n");
            lines = lines.filter(function(elem, pos) {
                return lines.indexOf(elem) === pos;
            });
            trace.groupStrategy(lines, crash, callback, overrideSettings);
        }
    },

    /**
    *  Post proces stacktrace before sending to browsr
    *  @param {object} crash - crash object
    */
    postprocessCrash: function(crash) {
        var parts, threads, thread, stack, new_stack;
        var rLineNumbers = /^\s*\d+\s+/gim;
        if (crash.native_cpp) {
            parts = crash.error.split("\n\n");
            threads = [];
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].indexOf("Thread") === 0) {
                    parts[i] = parts[i].replace(/\r\n|\r|\n/g, "\n");
                    parts[i] = parts[i].replace(/\t/g, "");
                    thread = {};
                    thread.id = threads.length;
                    stack = parts[i].split("\n");
                    thread.name = stack.shift().trim();
                    new_stack = [];
                    for (let j = 0; j < stack.length; j++) {
                        if (rLineNumbers.test(stack[j])) {
                            new_stack.push(stack[j]);
                        }
                    }
                    thread.error = new_stack.join("\n");
                    if (thread.name.indexOf("(crashed)") !== -1) {
                        thread.name = thread.name.replace("(crashed)", "");
                        crash.error = thread.error.replace(rLineNumbers, "");
                        thread.crashed = true;
                    }
                    threads.push(thread);
                }
            }
            crash.threads = threads;
            crash.error = crash.error || threads[0].error;

            if (crash.olderror) {
                parts = crash.olderror.split("\n\n");
                threads = [];
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].indexOf("Thread") === 0) {
                        parts[i] = parts[i].replace(/\r\n|\r|\n/g, "\n");
                        parts[i] = parts[i].replace(/\t/g, "");
                        thread = {};
                        thread.id = threads.length;
                        stack = parts[i].split("\n");
                        thread.name = stack.shift().trim();
                        new_stack = [];
                        for (let j = 0; j < stack.length; j++) {
                            if (rLineNumbers.test(stack[j])) {
                                new_stack.push(stack[j]);
                            }
                        }
                        thread.error = new_stack.join("\n");
                        if (thread.name.indexOf("(crashed)") !== -1) {
                            thread.name = thread.name.replace("(crashed)", "");
                            crash.olderror = thread.error.replace(rLineNumbers, "");
                            thread.crashed = true;
                        }
                        threads.push(thread);
                    }
                }
                crash.oldthreads = threads;
                crash.olderror = crash.olderror || threads[0].error;
            }
        }
        else if (crash.plcrash) {
            parts = crash.error.split("\n\n");
            threads = [];
            var noThread = true;
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].indexOf("Thread") === 0) {
                    noThread = false;
                    parts[i] = parts[i].replace(/\r\n|\r|\n/g, "\n");
                    parts[i] = parts[i].replace(/\t/g, "");
                    thread = {};
                    thread.id = threads.length;
                    stack = parts[i].split("\n");
                    thread.name = stack.shift().trim();
                    thread.error = stack.join("\n");
                    if (thread.name.indexOf("Crashed:") !== -1) {
                        thread.name = thread.name.replace("Crashed:", "");
                        crash.error = thread.error.replace(rLineNumbers, "");
                        thread.crashed = true;
                    }
                    threads.push(thread);
                }
                else if (noThread) {
                    if (threads.length === 0) {
                        threads.push({
                            id: 0,
                            name: "Info",
                            error: ""
                        });
                    }
                    parts[i] = parts[i].replace(/\r\n|\r|\n/g, "\n");
                    parts[i] = parts[i].replace(/\t/g, "");
                    threads[0].error += parts[i] + "\n\n";
                }
            }
            crash.threads = threads;
            crash.error = crash.error || threads[0].error;

            if (crash.olderror) {
                parts = crash.olderror.split("\n\n");
                threads = [];
                noThread = true;
                for (let i = 0; i < parts.length; i++) {
                    if (parts[i].indexOf("Thread") === 0) {
                        noThread = false;
                        parts[i] = parts[i].replace(/\r\n|\r|\n/g, "\n");
                        parts[i] = parts[i].replace(/\t/g, "");
                        thread = {};
                        thread.id = threads.length;
                        stack = parts[i].split("\n");
                        thread.name = stack.shift().trim();
                        thread.error = stack.join("\n");
                        if (thread.name.indexOf("Crashed:") !== -1) {
                            thread.name = thread.name.replace("Crashed:", "");
                            crash.olderror = thread.error.replace(rLineNumbers, "");
                            thread.crashed = true;
                        }
                        threads.push(thread);
                    }
                    else if (noThread) {
                        if (threads.length === 0) {
                            threads.push({
                                id: 0,
                                name: "Info",
                                error: ""
                            });
                        }
                        parts[i] = parts[i].replace(/\r\n|\r|\n/g, "\n");
                        parts[i] = parts[i].replace(/\t/g, "");
                        threads[0].error += parts[i] + "\n\n";
                    }
                }
                crash.oldthreads = threads;
                crash.olderror = crash.olderror || threads[0].error;
            }
        }
        else {
            parts = crash.error.replace(/^\s*\n/gim, "\n").split("\n\n");
            if (parts.length > 1) {
                crash.error = null;
                threads = [];
                for (let i = 0; i < parts.length; i++) {
                    thread = {};
                    thread.id = threads.length;
                    stack = parts[i].trim().split("\n");
                    thread.name = stack.shift().trim();
                    thread.error = stack.map(s => s.trim()).join("\n");
                    if (thread.name.indexOf("(crashed)") !== -1) {
                        thread.name = thread.name.replace("(crashed)", "");
                        crash.error = thread.error.replace(rLineNumbers, "");
                        thread.crashed = true;
                    }
                    threads.push(thread);
                }
                crash.threads = threads;
                crash.error = crash.error || threads[0].error;
            }

            if (crash.olderror) {
                parts = crash.olderror.replace(/^\s*\n/gim, "\n").split("\n\n");
                if (parts.length > 1) {
                    crash.olderror = null;
                    threads = [];
                    for (let i = 0; i < parts.length; i++) {
                        thread = {};
                        thread.id = threads.length;
                        stack = parts[i].trim().split("\n");
                        thread.name = stack.shift().trim();
                        thread.error = stack.map(s => s.trim()).join("\n");
                        if (thread.name.indexOf("(crashed)") !== -1) {
                            thread.name = thread.name.replace("(crashed)", "");
                            crash.olderror = thread.error.replace(rLineNumbers, "");
                            thread.crashed = true;
                        }
                        threads.push(thread);
                    }
                    crash.oldthreads = threads;
                    crash.olderror = crash.olderror || threads[0].error;
                }
            }
        }
    }
};

module.exports = trace;