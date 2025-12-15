const pino = require('pino');

// Optional OpenTelemetry imports
let trace;
let context;
let metrics;
let semanticConventions;
try {
    trace = require('@opentelemetry/api').trace;
    context = require('@opentelemetry/api').context;
    metrics = require('@opentelemetry/api').metrics;
    semanticConventions = require('@opentelemetry/semantic-conventions');
    // eslint-disable-next-line no-empty
}
catch (e) {
    // do nothing
}

/**
 * Mapping of short level codes to full level names
 * @type {Object.<string, string>}
 */
const LEVELS = {
    d: 'debug',
    i: 'info',
    w: 'warn',
    e: 'error'
};

/**
 * Mapping of log levels to acceptable log levels
 * @type {Object.<string, string[]>}
 */
const ACCEPTABLE = {
    d: ['debug'],
    i: ['debug', 'info'],
    w: ['debug', 'info', 'warn'],
    e: ['debug', 'info', 'warn', 'error'],
};


// Initialize configuration with defaults
let prefs = require('../config.js', 'dont-enclose').logging || {};
prefs.default = prefs.default || "warn";
let deflt = (prefs && prefs.default) ? prefs.default : 'error';
let prettyPrint = prefs.prettyPrint || false;

// Singleton transport for pretty-print to avoid memory leaks
let prettyTransport = null;

/**
 * Current levels for all modules
 * @type {Object.<string, string>}
 */
const levels = {};

// Metrics setup if OpenTelemetry is available
let logCounter;
let logDurationHistogram;

if (metrics) {
    const meter = metrics.getMeter('logger');
    logCounter = meter.createCounter('log_entries_total', {
        description: 'Number of log entries by level and module',
    });
    logDurationHistogram = meter.createHistogram('log_duration_seconds', {
        description: 'Duration of logging operations',
    });
}

/**
 * Gets the current trace context if OpenTelemetry is available
 * @returns {Object|null} Trace context object or null if unavailable
 */
function getTraceContext() {
    if (!trace) {
        return null;
    }

    const currentSpan = trace.getSpan(context.active());
    if (!currentSpan) {
        return null;
    }

    const spanContext = currentSpan.spanContext();
    return {
        'traceId': spanContext.traceId,
        'spanId': spanContext.spanId,
        'traceFlags': spanContext.traceFlags.toString(16)
    };
}

/**
 * Creates a logging span if OpenTelemetry is available
 * @param {string} name - The module name
 * @param {string} level - The log level
 * @param {string} message - The log message
 * @returns {Span|null} The created span or null if unavailable
 */
function createLoggingSpan(name, level, message) {
    if (!trace) {
        return null;
    }

    const tracer = trace.getTracer('logger');
    return tracer.startSpan(`log.${level}`, {
        attributes: {
            [semanticConventions.SemanticAttributes.CODE_FUNCTION]: name,
            [semanticConventions.SemanticAttributes.CODE_NAMESPACE]: 'logger',
            'logging.level': level,
            'logging.message': message
        }
    });
}

/**
 * Records metrics for logging operations
 * @param {string} name - The module name
 * @param {string} level - The log level
 */
function recordMetrics(name, level) {
    if (logCounter) {
        logCounter.add(1, {
            module: name,
            level: level
        });
    }
}

/**
 * Looks for logging level in config for a particular module
 * @param {string} name - The module name
 * @returns {string} The configured log level
 */
const logLevel = function(name) {
    if (typeof prefs === 'undefined') {
        return 'error';
    }
    else if (typeof prefs === 'string') {
        return prefs;
    }
    else {
        for (let level in prefs) {
            if (typeof prefs[level] === 'string' && name.indexOf(prefs[level]) === 0) {
                return level;
            }
            if (typeof prefs[level] === 'object' && prefs[level].length) {
                for (let i = prefs[level].length - 1; i >= 0; i--) {
                    let opt = prefs[level][i];
                    if (opt === name || name.indexOf(opt) === 0) {
                        return level;
                    }
                }
            }
        }
        return deflt;
    }
};

/**
 * Creates a Pino logger instance with the appropriate configuration
 * @param {string} name - The module name
 * @param {string} [level] - The log level
 * @returns {Logger} Configured Pino logger instance
 */
const createLogger = (name, level) => {
    const config = {
        name,
        level: level || deflt,
        timestamp: pino.stdTimeFunctions.isoTime,
        hooks: {
            logMethod(args, method) {
                if (args.length > 1) {
                    // Create an object with all arguments in order
                    const logObj = {};
                    let messageArg = null;

                    for (let i = 0; i < args.length; i++) {
                        const arg = args[i];
                        const key = `arg${i}`;

                        if (typeof arg === 'object' && arg !== null) {
                            if (arg instanceof Error) {
                                // Store error with full stack trace
                                logObj[key] = {
                                    name: arg.name,
                                    message: arg.message,
                                    stack: arg.stack,
                                    // Include any custom properties
                                    ...Object.getOwnPropertyNames(arg).reduce((acc, prop) => {
                                        if (!['name', 'message', 'stack'].includes(prop)) {
                                            acc[prop] = arg[prop];
                                        }
                                        return acc;
                                    }, {})
                                };
                            }
                            else {
                                // Store object natively
                                logObj[key] = arg;
                            }
                        }
                        else {
                            // Store primitive values
                            logObj[key] = arg;
                        }

                        // Use first string-like argument as message, or first argument if no strings
                        if (messageArg === null && (typeof arg === 'string' || typeof arg === 'number')) {
                            messageArg = String(arg);
                        }
                    }

                    // If no string found, use the first argument as message
                    if (messageArg === null && args.length > 0) {
                        messageArg = String(args[0]);
                    }

                    method.apply(this, [logObj, messageArg || '']);
                }
                else {
                    method.apply(this, args);
                }
            }
        },
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() };
            },
            log: (object) => {
                const traceContext = getTraceContext();
                return traceContext ? { ...object, ...traceContext } : object;
            }
        }
    };

    // Add pretty-print configuration if enabled
    if (prettyPrint) {
        // Use singleton transport to avoid memory leaks
        if (!prettyTransport) {
            prettyTransport = pino.transport({
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname'
                }
            });
        }
        return pino(config, prettyTransport);
    }
    else {
        return pino(config);
    }
};

/**
 * Creates a logging function for a specific level
 * @param {Logger} logger - The Pino logger instance
 * @param {string} name - The module name
 * @param {string} level - The log level code (d, i, w, e)
 * @returns {Function} The logging function
 */
const createLogFunction = (logger, name, level) => {
    return function(...args) {
        const currentLevel = levels[name] || deflt;
        if (ACCEPTABLE[level].indexOf(currentLevel) !== -1) {
            const startTime = performance.now();
            const message = args[0];

            // Create span for this logging operation
            const span = createLoggingSpan(name, LEVELS[level], message);

            try {
                // Pass all arguments directly to Pino - the logMethod hook will handle them
                logger[LEVELS[level]](...args);

                // Record metrics
                recordMetrics(name, LEVELS[level]);

                // Record duration
                if (logDurationHistogram) {
                    const duration = (performance.now() - startTime) / 1000; // Convert to seconds
                    logDurationHistogram.record(duration, {
                        module: name,
                        level: LEVELS[level]
                    });
                }
            }
            finally {
                if (span) {
                    span.end();
                }
            }
        }
    };
};

/**
 * Sets current logging level for a module
 * @param {string} module - The module name
 * @param {string} level - The log level
 */
const setLevel = function(module, level) {
    levels[module] = level;
};

/**
 * Sets default logging level
 * @param {string} level - The log level
 */
const setDefault = function(level) {
    deflt = level;
};

/**
 * Sets pretty-print option
 * @param {boolean} enabled - Whether to enable pretty-print
 */
const setPrettyPrint = function(enabled) {
    prettyPrint = enabled;

    // Reset transport when changing pretty-print setting
    if (prettyTransport) {
        prettyTransport.end();
        prettyTransport = null;
    }
};

/**
 * Gets current logging level for a module
 * @param {string} module - The module name
 * @returns {string} The current log level
 */
const getLevel = function(module) {
    return levels[module] || deflt;
};

/**
 * Creates a new logger instance
 * @param {string} name - The module name
 * @returns {Object} Logger instance with various methods
 */
module.exports = function(name) {
    setLevel(name, logLevel(name));
    const logger = createLogger(name, levels[name]);

    /**
     * Creates a sub-logger with the parent's name as prefix
     * @param {string} subname - The sub-logger name
     * @returns {Object} Sub-logger instance
     */
    const createSubLogger = (subname) => {
        const full = name + ':' + subname;
        setLevel(full, logLevel(full));
        const subLogger = createLogger(full, levels[full]);

        return {
            /**
             * Returns the full identifier of this sub-logger
             * @returns {string} Full logger identifier
             */
            id: () => full,

            /**
             * Logs a debug message
             * @param {...*} args - Message and optional parameters
             */
            d: createLogFunction(subLogger, full, 'd'),

            /**
             * Logs an info message
             * @param {...*} args - Message and optional parameters
             */
            i: createLogFunction(subLogger, full, 'i'),

            /**
             * Logs a warning message
             * @param {...*} args - Message and optional parameters
             */
            w: createLogFunction(subLogger, full, 'w'),

            /**
             * Logs an error message
             * @param {...*} args - Message and optional parameters
             */
            e: createLogFunction(subLogger, full, 'e'),

            /**
             * Conditionally executes a function based on current log level
             * @param {string} l - Log level code
             * @param {Function} fn - Function to execute if level is enabled
             * @param {string} [fl] - Fallback log level
             * @param {...*} fargs - Arguments for fallback
             * @returns {boolean} True if the function was executed
             */
            f: function(l, fn, fl, ...fargs) {
                if (ACCEPTABLE[l].indexOf(levels[full] || deflt) !== -1) {
                    fn(createLogFunction(subLogger, full, l));
                    return true;
                }
                else if (fl) {
                    this[fl].apply(this, fargs);
                }
            },

            /**
             * Creates a nested sub-logger
             * @param {string} subname - The nested sub-logger name
             * @returns {Object} Nested sub-logger instance
             */
            sub: createSubLogger
        };
    };

    return {
        /**
         * Returns the identifier of this logger
         * @returns {string} Logger identifier
         */
        id: () => name,

        /**
         * Logs a debug message
         * @param {...*} args - Message and optional parameters
         */
        d: createLogFunction(logger, name, 'd'),

        /**
         * Logs an info message
         * @param {...*} args - Message and optional parameters
         */
        i: createLogFunction(logger, name, 'i'),

        /**
         * Logs a warning message
         * @param {...*} args - Message and optional parameters
         */
        w: createLogFunction(logger, name, 'w'),

        /**
         * Logs an error message
         * @param {...*} args - Message and optional parameters
         */
        e: createLogFunction(logger, name, 'e'),

        /**
         * Conditionally executes a function based on current log level
         * @param {string} l - Log level code
         * @param {Function} fn - Function to execute if level is enabled
         * @param {string} [fl] - Fallback log level
         * @param {...*} fargs - Arguments for fallback
         * @returns {boolean} True if the function was executed
         */
        f: function(l, fn, fl, ...fargs) {
            if (ACCEPTABLE[l].indexOf(levels[name] || deflt) !== -1) {
                fn(createLogFunction(logger, name, l));
                return true;
            }
            else if (fl) {
                this[fl].apply(this, fargs);
            }
        },

        /**
         * Creates a callback function that logs errors
         * @param {Function} [next] - Function to call on success
         * @returns {Function} Callback function
         */
        callback: function(next) {
            const self = this;
            return function(err) {
                if (err) {
                    self.e(err);
                }
                else if (next) {
                    const args = Array.prototype.slice.call(arguments, 1);
                    next.apply(this, args);
                }
            };
        },

        /**
         * Creates a database operation callback that logs results
         * @param {string} opname - Operation name
         * @param {Function} [next] - Function to call on success
         * @param {Function} [nextError] - Function to call on error
         * @returns {Function} Database callback function
         */
        logdb: function(opname, next, nextError) {
            const self = this;
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
         * Creates a sub-logger with the current logger's name as prefix
         * @param {string} subname - The sub-logger name
         * @returns {Object} Sub-logger instance
         */
        sub: createSubLogger
    };
};

// Export static methods
/**
 * Sets logging level for a specific module
 * @param {string} module - The module name
 * @param {string} level - The log level
 */
module.exports.setLevel = setLevel;

/**
 * Sets default logging level for all modules without explicit configuration
 * @param {string} level - The log level
 */
module.exports.setDefault = setDefault;

/**
 * Sets pretty-print option for all loggers
 * @param {boolean} enabled - Whether to enable pretty-print
 */
module.exports.setPrettyPrint = setPrettyPrint;

/**
 * Gets current logging level for a module
 * @param {string} module - The module name
 * @returns {string} The current log level
 */
module.exports.getLevel = getLevel;

/**
 * Indicates if OpenTelemetry integration is available
 * @type {boolean}
 */
module.exports.hasOpenTelemetry = Boolean(trace && metrics);

/**
 * Updates the logging configuration for all modules.
 * 
 * @param {Object} msg - The message containing the new logging configuration.
 * @param {string} msg.cmd - The command type, should be 'log' to trigger update.
 * @param {Object} msg.config - The configuration object mapping log levels to module lists.
 * @param {string} [msg.config.default] - The default log level for modules not explicitly listed.
 * 
 * This function updates the internal logging levels and preferences based on the provided configuration.
 * It is typically used to dynamically adjust logging settings at runtime.
 */
module.exports.updateConfig = function(msg) {
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