'use strict';

/**
 * Log provides a wrapper over debug or console functions with log level filtering, module filtering and ability to store log in database.
 * Uses configuration require('../config.js').logging:
 * {
 *  'info': ['app', 'auth', 'static'],      // log info and higher level for modules 'app*', 'auth*', 'static*'
 *  'debug': ['api.users'],                 // log debug and higher (in fact everything) for modules 'api.users*'
 *  'default': 'warn',                      // log warn and higher for all other modules
 * }
 * Note that log levels supported are ['debug', 'info', 'warn', 'error']
 *
 * Usage is quite simple:
 * var log = require('common.js').log('module[:submodule[:subsubmodule]]');
 * log.i('something happened: %s, %j', 'string', {obj: 'ect'});
 * log.e('something really bad happened: %j', new Error('Oops'));
 *
 * Whenever DEBUG is in process.env, log outputs all filtered messages with debug module instead of console so you could have pretty colors in console.
 * In other cases only log.d is logged using debug module.
 * 
 * To control log level at runtime, call require('common.js').log.setLevel('events', 'debug'). From now on 'events' logger will log everything.
 *
 * There is also a handy method for generating standard node.js callbacks which log error. Only applicable if no actions in case of error needed:
 * collection.find().toArray(log.callback(function(arg1, arg2){ // all good }));
 * - if error didn't happen, function is called
 * - if error happened, it will be logged, but function won't be called
 * - if error happened, arg1 is a first argument AFTER error, it's not an error
 * @module api/utils/log
 */

var prefs = require('../config.js', 'dont-enclose').logging || {};
prefs.default = prefs.default || "warn";
var colors = require('colors');
var deflt = (prefs && prefs.default) ? prefs.default : 'error';

for (let level in prefs) {
    if (prefs[level].sort) {
        prefs[level].sort();
    }
}

var styles = {
    moduleColors: {
        //      'push:*api': 0 // green
        '[last]': -1
    },
    colors: ['green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'red'],
    stylers: {
        warn: function(args) {
            for (var i = 0; i < args.length; i++) {
                if (typeof args[i] === 'string') {
                    args[i] = colors.bgYellow.black(args[i].black);
                }
            }
        },
        error: function(args) {
            for (var i = 0; i < args.length; i++) {
                if (typeof args[i] === 'string') {
                    args[i] = colors.bgRed.white(args[i].white);
                }
            }
        }
    }
};

const ACCEPTABLE = {
    d: ['debug'],
    i: ['debug', 'info'],
    w: ['debug', 'info', 'warn'],
    e: ['debug', 'info', 'warn', 'error'],
};

const NAMES = {
    d: 'DEBUG',
    i: 'INFO',
    w: 'WARN',
    e: 'ERROR'
};

/**
 * Returns logger function for given preferences
 * @param {string} level - log level
 * @param {string} prefix - add prefix to message
 * @param {boolean} enabled - whether function should log anything
 * @param {object} outer - this for @out
 * @param {function} out - output function (console or debug)
 * @param {function} styler - function to apply styles
 * @returns {function} logger function
 */
var log = function(level, prefix, enabled, outer, out, styler) {
    return function() {
        // console.log(level, prefix, enabled(), arguments);
        if (enabled()) {
            var args = Array.prototype.slice.call(arguments, 0);
            var color = styles.moduleColors[prefix];
            if (color === undefined) {
                color = (++styles.moduleColors['[last]']) % styles.colors.length;
                styles.moduleColors[prefix] = color;
            }
            color = styles.colors[color];
            if (styler) {
                args[0] = new Date().toISOString() + ': ' + level + '\t' + '[' + (prefix || '') + ']\t' + args[0];
                styler(args);
            }
            else {
                args[0] = (new Date().toISOString() + ': ' + level + '\t').gray + colors[color]('[' + (prefix || '') + ']\t') + args[0];
            }
            // args[0] = (new Date().toISOString() + ': ' + (prefix || '')).gray + args[0];
            // console.log('Logging %j', args);
            if (typeof out === 'function') {
                out.apply(outer, args);
            }
            else {
                for (var k in out) {
                    out[k].apply(outer, args);
                }
            }
        }
    };
};

/**
 * Looks for logging level in config for a particular module
 * @param {string} name - module name
 * @returns {string} log level
 */
var logLevel = function(name) {
    if (typeof prefs === 'undefined') {
        return 'error';
    }
    else if (typeof prefs === 'string') {
        return prefs;
    }
    else {
        for (var level in prefs) {
            if (typeof prefs[level] === 'string' && name.indexOf(prefs[level]) === 0) {
                return level;
            }
            if (typeof prefs[level] === 'object' && prefs[level].length) {
                for (var i = prefs[level].length - 1; i >= 0; i--) {
                    var opt = prefs[level][i];
                    if (opt === name || name.indexOf(opt) === 0) {
                        return level;
                    }
                }
                // for (var m in prefs[level]) {
                //  if (name.indexOf(prefs[level][m]) === 0) { return level; }
                // }
            }
        }
        return deflt;
    }
};

/**
 * Current levels for all modules
 */
var levels = {
    // mongo: 'info'
};
/**
* Sets current logging level
* @static
* @param {string} module - name of the module for logging
* @param {string} level -  level of logging, possible values are: debug, info, warn, error
**/
var setLevel = function(module, level) {
    levels[module] = level;
};
/**
* Sets default logging level for all modules, that do not have specific level set
* @static
* @param {string} level -  level of logging, possible values are: debug, info, warn, error
**/
var setDefault = function(level) {
    deflt = level;
};
/**
* Get currently set logging level for module
* @static
* @param {string} module - name of the module for logging
* @returns {string} level of logging, possible values are: debug, info, warn, error
**/
var getLevel = function(module) {
    return levels[module] || deflt;
};

var getEnabledWithLevel = function(acceptable, module) {
    return function() {
        // if (acceptable.indexOf(levels[module]) === -1) {
        //  console.log('Won\'t log %j because %j doesn\'t have %j (%j)', module, acceptable, levels[module], levels);
        // }
        return acceptable.indexOf(levels[module] || deflt) !== -1;
    };
};
/**
* Handle messages from ipc
* @static
* @param {string} msg - message received from other processes
**/
var ipcHandler = function(msg) {
    var m, l, modules, i;

    if (!msg || msg.cmd !== 'log' || !msg.config) {
        return;
    }

    // console.log('%d: Setting logging config to %j (was %j)', process.pid, msg.config, levels);

    if (msg.config.default) {
        deflt = msg.config.default;
    }

    for (m in levels) {
        var found = null;
        for (l in msg.config) {
            modules = msg.config[l].split(',').map(function(v) {
                return v.trim();
            });

            for (i = 0; i < modules.length; i++) {
                if (modules[i] === m) {
                    found = l;
                }
            }
        }

        if (found === null) {
            for (l in msg.config) {
                modules = msg.config[l].split(',').map(function(v) {
                    return v.trim();
                });

                for (i = 0; i < modules.length; i++) {
                    if (modules[i].indexOf('*') === -1 && modules[i] === m.split(':')[0]) {
                        found = l;
                    }
                    else if (modules[i].indexOf('*') !== -1 && modules[i].split(':')[1] === '*' && modules[i].split(':')[0] === m.split(':')[0]) {
                        found = l;
                    }
                }
            }
        }

        if (found !== null) {
            levels[m] = found;
        }
        else {
            levels[m] = deflt;
        }
    }

    for (l in msg.config) {
        if (msg.config[l] && l !== 'default') {
            modules = msg.config[l].split(',').map(function(v) {
                return v.trim();
            });
            prefs[l] = modules;

            for (i in modules) {
                m = modules[i];
                if (!(m in levels)) {
                    levels[m] = l;
                }
            }
        }
        else {
            prefs[l] = [];
        }
    }

    prefs.default = msg.config.default;

    // console.log('%d: Set logging config to %j (now %j)', process.pid, msg.config, levels);
};

/**
* Creates new logger object for provided module
* @param {string} name - name of the module
* @returns {module:api/utils/log~Logger} logger object
**/
module.exports = function(name) {
    setLevel(name, logLevel(name));
    // console.log('Got level for ' + name + ': ' + levels[name] + ' ( prefs ', prefs);
    /**
    * @class Logger
    **/
    return {
        /**
         * Get logger id
         * @returns {string} id of this logger
         */
        id: () => name,
        /**
        * Log debug level messages
        * @memberof module:api/utils/log~Logger
        * @param {...*} var_args - string and values to format string with
        **/
        d: log(NAMES.d, name, getEnabledWithLevel(ACCEPTABLE.d, name), this, console.log),

        /**
        * Log information level messages
        * @memberof module:api/utils/log~Logger
        * @param {...*} var_args - string and values to format string with
        **/
        i: log(NAMES.i, name, getEnabledWithLevel(ACCEPTABLE.i, name), this, console.info),

        /**
        * Log warning level messages
        * @memberof module:api/utils/log~Logger
        * @param {...*} var_args - string and values to format string with
        **/
        w: log(NAMES.w, name, getEnabledWithLevel(ACCEPTABLE.w, name), this, console.warn, styles.stylers.warn),

        /**
        * Log error level messages
        * @memberof module:api/utils/log~Logger
        * @param {...*} var_args - string and values to format string with
        **/
        e: log(NAMES.e, name, getEnabledWithLevel(ACCEPTABLE.e, name), this, console.error, styles.stylers.error),

        /**
         * Log variable level messages (for cases when logging parameters calculation are expensive enough and shouldn't be done unless the level is enabled)
         * @param {String} l log level (d, i, w, e)
         * @param {function} fn function to call with single argument - logging function
         * @param {String} fl fallback level if l is disabled
         * @param {any[]} fargs fallback level arguments
         * @returns {boolean} true if f() has been called
         */
        f: function(l, fn, fl, ...fargs) {
            if (ACCEPTABLE[l].indexOf(levels[name] || deflt) !== -1) {
                fn(log(NAMES[l], name, getEnabledWithLevel(ACCEPTABLE[l], name), this, l === 'e' ? console.error : l === 'w' ? console.warn : console.log, l === 'w' ? styles.stylers.warn : l === 'e' ? styles.stylers.error : undefined));
                return true;
            }
            else if (fl) {
                this[fl].apply(this, fargs);
            }
        },

        /**
        * Logging inside callbacks
        * @memberof module:api/utils/log~Logger
        * @param {function=} next - next function to call, after callback executed
        * @returns {function} function to pass as callback
        **/
        callback: function(next) {
            var self = this;
            return function(err) {
                if (err) {
                    self.e(err);
                }
                else if (next) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    next.apply(this, args);
                }
            };
        },
        /**
        * Logging database callbacks
        * @memberof module:api/utils/log~Logger
        * @param {string} opname - name of the performed operation
        * @param {function=} next - next function to call, after callback executed
        * @param {function=} nextError - function to pass error to
        * @returns {function} function to pass as callback
        **/
        logdb: function(opname, next, nextError) {
            var self = this;
            return function(err) {
                if (err) {
                    self.e('Error while %j: %j', opname, err);
                    if (nextError) {
                        nextError(err);
                    }
                }
                else {
                    self.d('Done %j', opname);
                    if (next) {
                        next.apply(this, Array.prototype.slice.call(arguments, 1));
                    }
                }
            };
        },
        /**
         * Add one more level to the logging output while leaving loglevel the same
         * @param {string} subname sublogger name
         * @returns {object} new logger
         */
        sub: function(subname) {
            let full = name + ':' + subname,
                self = this;

            setLevel(full, logLevel(full));

            return {
                /**
                 * Get logger id
                 * @returns {string} id of this logger
                 */
                id: () => full,
                /**
                * Log debug level messages
                * @memberof module:api/utils/log~Logger
                * @param {...*} var_args - string and values to format string with
                **/
                d: log(NAMES.d, full, getEnabledWithLevel(ACCEPTABLE.d, full), this, console.log),

                /**
                * Log information level messages
                * @memberof module:api/utils/log~Logger
                * @param {...*} var_args - string and values to format string with
                **/
                i: log(NAMES.i, full, getEnabledWithLevel(ACCEPTABLE.i, full), this, console.info),

                /**
                * Log warning level messages
                * @memberof module:api/utils/log~Logger
                * @param {...*} var_args - string and values to format string with
                **/
                w: log(NAMES.w, full, getEnabledWithLevel(ACCEPTABLE.w, full), this, console.warn, styles.stylers.warn),

                /**
                * Log error level messages
                * @memberof module:api/utils/log~Logger
                * @param {...*} var_args - string and values to format string with
                **/
                e: log(NAMES.e, full, getEnabledWithLevel(ACCEPTABLE.e, full), this, console.error, styles.stylers.error),

                /**
                 * Log variable level messages (for cases when logging parameters calculation are expensive enough and shouldn't be done unless the level is enabled)
                 * @param {String} l log level (d, i, w, e)
                 * @param {function} fn function to call with single argument - logging function
                 * @param {String} fl fallback level if l is disabled
                 * @param {any[]} fargs fallback level arguments
                 * @returns {boolean} true if f() has been called
                 */
                f: function(l, fn, fl, ...fargs) {
                    if (ACCEPTABLE[l].indexOf(levels[name] || deflt) !== -1) {
                        fn(log(NAMES[l], full, getEnabledWithLevel(ACCEPTABLE[l], full), this, l === 'e' ? console.error : l === 'w' ? console.warn : console.log, l === 'w' ? styles.stylers.warn : l === 'e' ? styles.stylers.error : undefined));
                        return true;
                    }
                    else if (fl) {
                        this[fl].apply(this, fargs);
                    }
                },

                /**
                 * Pass sub one level up
                 */
                sub: self.sub.bind(self)
            };
        }
    };
    // return {
    //  d: log('DEBUG\t', getEnabledWithLevel(ACCEPTABLE.d, name), this, debug(name)),
    //  i: log('INFO\t', getEnabledWithLevel(ACCEPTABLE.i, name), this, debug(name)),
    //  w: log('WARN\t', getEnabledWithLevel(ACCEPTABLE.w, name), this, debug(name)),
    //  e: log('ERROR\t', getEnabledWithLevel(ACCEPTABLE.e, name), this, debug(name)),
    //  callback: function(next){
    //      var self = this;
    //      return function(err) {
    //          if (err) { self.e(err); }
    //          else if (next) {
    //              var args = Array.prototype.slice.call(arguments, 1);
    //              next.apply(this, args);
    //          }
    //      };
    //  },
    // };
};

module.exports.setLevel = setLevel;
module.exports.setDefault = setDefault;
module.exports.getLevel = getLevel;
module.exports.ipcHandler = ipcHandler;