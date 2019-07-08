/**
* Module to process stacktraces
* @module plugins/crashes/api/parts/stacktrace
*/
var minidump = require("./minidump.js");

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
    * Process crash
    * @param {object} crash - Crash object
    * @param {function} callback - to be called when processing is done
    */
    preprocessCrash: function(crash, callback) {
        if (crash._native_cpp) {
            minidump.processMinidump(crash._error, function(err, data) {
                if (!err) {
                    crash._binary_crash_dump = crash._error;
                    crash._error = data;
                    var stack = trace.processNativeThreads(data);
                    crash._name = stack[0];
                    callback(stack.join("\n"));
                }
                else {
                    console.log("Can't symbolicate", err);
                    crash._binary_crash_dump = crash._error;
                    crash._error = "Unsymbolicated native crash";
                    crash._symbolication_error = err;
                    crash._unprocessed = true;
                    callback(crash._error);
                }
            });
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
            error = lines.join("\n");
            callback(error);
        }
    },

    /**
    *  Post proces stacktrace before sending to browsr
    *  @param {object} crash - crash object
    */
    postprocessCrash: function(crash) {
        var parts, threads, thread, stack, new_stack;
        if (crash.native_cpp) {
            var rLineNumbers = /^\s*\d+\s+/gim;
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