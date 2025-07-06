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
        'trace.id': spanContext.traceId,
        'span.id': spanContext.spanId,
        'trace.flags': spanContext.traceFlags.toString(16)
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
    return pino({
        name,
        level: level || deflt,
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() };
            },
            log: (object) => {
                const traceContext = getTraceContext();
                return traceContext ? { ...object, ...traceContext } : object;
            }
        }
    });
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
                if (args.length === 1) {
                    logger[LEVELS[level]](args[0]);
                }
                else {
                    // For backward compatibility: if no format specifiers found, concatenate args
                    const firstArg = String(args[0]);
                    if (!firstArg.includes('%')) {
                        // No format specifiers, concatenate all arguments
                        const msg = args.map(arg => {
                            if (typeof arg === 'object') {
                                return JSON.stringify(arg);
                            }
                            return String(arg);
                        }).join(' ');
                        logger[LEVELS[level]](msg);
                    }
                    else {
                        // Format specifiers present, use Pino's formatting
                        logger[LEVELS[level]](args[0], ...args.slice(1));
                    }
                }

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