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

/**
 * Load logging configuration from environment variables or config file
 * Environment variables take precedence over config.js values
 * Format: COUNTLY_SETTINGS__LOGS__<KEY> where KEY is DEBUG, INFO, WARN, ERROR, DEFAULT, or PRETTYPRINT
 * @returns {Object} Logging configuration object with debug, info, warn, error, default, and prettyPrint properties
 */
function loadLoggingConfig() {
    // Start with config.js values
    let prefs = require('../config.js', 'dont-enclose').logging || {};

    // Check for environment variable overrides
    const envDebug = process.env.COUNTLY_SETTINGS__LOGS__DEBUG;
    const envInfo = process.env.COUNTLY_SETTINGS__LOGS__INFO;
    const envWarn = process.env.COUNTLY_SETTINGS__LOGS__WARN;
    const envError = process.env.COUNTLY_SETTINGS__LOGS__ERROR;
    const envDefault = process.env.COUNTLY_SETTINGS__LOGS__DEFAULT;
    const envPrettyPrint = process.env.COUNTLY_SETTINGS__LOGS__PRETTYPRINT;

    /**
     * Helper to parse environment variable as array
     * @param {string} envValue - Environment variable value
     * @returns {Array} Parsed array of module names
     */
    const parseEnvArray = (envValue) => {
        try {
            return JSON.parse(envValue);
        }
        catch (e) {
            return envValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
    };

    /**
     * Helper to remove modules from other log levels to avoid conflicts
     * @param {Array} modules - Array of module names
     * @param {string} currentLevel - The level being set
     */
    const removeFromOtherLevels = (modules, currentLevel) => {
        const levels = ['debug', 'info', 'warn', 'error'];
        for (let level of levels) {
            if (level !== currentLevel && Array.isArray(prefs[level])) {
                prefs[level] = prefs[level].filter(m => !modules.includes(m));
            }
        }
    };

    // Override with environment variables if present
    if (envDebug !== undefined) {
        prefs.debug = parseEnvArray(envDebug);
        removeFromOtherLevels(prefs.debug, 'debug');
    }

    if (envInfo !== undefined) {
        prefs.info = parseEnvArray(envInfo);
        removeFromOtherLevels(prefs.info, 'info');
    }

    if (envWarn !== undefined) {
        prefs.warn = parseEnvArray(envWarn);
        removeFromOtherLevels(prefs.warn, 'warn');
    }

    if (envError !== undefined) {
        prefs.error = parseEnvArray(envError);
        removeFromOtherLevels(prefs.error, 'error');
    }

    if (envDefault !== undefined) {
        prefs.default = envDefault;
    }
    else if (process.env.CI === 'true') {
        // In CI environment with no explicit COUNTLY_SETTINGS__LOGS__DEFAULT, suppress all logs
        prefs.default = 'silent';
    }

    if (envPrettyPrint !== undefined) {
        try {
            prefs.prettyPrint = JSON.parse(envPrettyPrint);
        }
        catch (e) {
            prefs.prettyPrint = envPrettyPrint === 'true';
        }
    }

    return prefs;
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
 * Singleton manager for logging configuration and shared state
 * @class LogManager
 */
class LogManager {
    /** @type {LogManager|null} */
    static #instance = null;

    /** @type {Object} Logging preferences */
    #prefs;

    /** @type {string} Default log level */
    #deflt;

    /** @type {boolean} Pretty print enabled */
    #prettyPrint;

    /** @type {Object|null} Pino transport for pretty printing */
    #prettyTransport = null;

    /** @type {Object.<string, string>} Module to level cache */
    #levels = {};

    /** @type {Object|null} OpenTelemetry log counter */
    #logCounter = null;

    /** @type {Object|null} OpenTelemetry duration histogram */
    #logDurationHistogram = null;

    /**
     * Creates a new LogManager instance (private constructor pattern)
     * @private
     */
    constructor() {
        if (LogManager.#instance) {
            return LogManager.#instance;
        }

        this.#prefs = loadLoggingConfig();
        this.#prefs.default = this.#prefs.default || 'warn';
        this.#deflt = this.#prefs.default || 'error';
        this.#prettyPrint = this.#prefs.prettyPrint || false;

        // Initialize OpenTelemetry metrics if available
        if (metrics) {
            const meter = metrics.getMeter('logger');
            this.#logCounter = meter.createCounter('log_entries_total', {
                description: 'Number of log entries by level and module',
            });
            this.#logDurationHistogram = meter.createHistogram('log_duration_seconds', {
                description: 'Duration of logging operations',
            });
        }

        LogManager.#instance = this;
    }

    /**
     * Gets the singleton LogManager instance
     * @returns {LogManager} The singleton instance
     */
    static getInstance() {
        if (!LogManager.#instance) {
            LogManager.#instance = new LogManager();
        }
        return LogManager.#instance;
    }

    /**
     * Sets current logging level for a module
     * @param {string} module - The module name
     * @param {string} level - The log level
     */
    setLevel(module, level) {
        this.#levels[module] = level;
    }

    /**
     * Sets default logging level
     * @param {string} level - The log level
     */
    setDefault(level) {
        this.#deflt = level;
    }

    /**
     * Gets current logging level for a module
     * @param {string} [module] - The module name
     * @returns {string} The current log level
     */
    getLevel(module) {
        if (module) {
            if (!(module in this.#levels)) {
                return this.logLevel(module);
            }
            return this.#levels[module];
        }
        return this.#deflt;
    }

    /**
     * Gets the cached level for a module
     * @param {string} module - The module name
     * @returns {string|undefined} The cached level or undefined
     */
    getCachedLevel(module) {
        return this.#levels[module];
    }

    /**
     * Gets the default log level
     * @returns {string} The default log level
     */
    getDefault() {
        return this.#deflt;
    }

    /**
     * Sets pretty-print option
     * @param {boolean} enabled - Whether to enable pretty-print
     */
    setPrettyPrint(enabled) {
        this.#prettyPrint = enabled;

        // Reset transport when changing pretty-print setting
        if (this.#prettyTransport) {
            this.#prettyTransport.end();
            this.#prettyTransport = null;
        }
    }

    /**
     * Gets pretty-print setting
     * @returns {boolean} Whether pretty-print is enabled
     */
    getPrettyPrint() {
        return this.#prettyPrint;
    }

    /**
     * Gets or creates the pretty transport singleton
     * @returns {Object|null} The pretty transport or null
     */
    getPrettyTransport() {
        if (!this.#prettyPrint) {
            return null;
        }

        if (!this.#prettyTransport) {
            this.#prettyTransport = pino.transport({
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname'
                }
            });
        }
        return this.#prettyTransport;
    }

    /**
     * Looks for logging level in config for a particular module
     * @param {string} name - The module name
     * @returns {string} The configured log level
     */
    logLevel(name) {
        if (typeof this.#prefs === 'undefined') {
            return 'error';
        }
        else if (typeof this.#prefs === 'string') {
            return this.#prefs;
        }
        else {
            // Check log levels in priority order (most verbose first)
            const validLevels = ['debug', 'info', 'warn', 'error'];

            for (let level of validLevels) {
                if (!this.#prefs[level]) {
                    continue;
                }

                if (typeof this.#prefs[level] === 'string' && name.indexOf(this.#prefs[level]) === 0) {
                    return level;
                }
                if (typeof this.#prefs[level] === 'object' && Array.isArray(this.#prefs[level]) && this.#prefs[level].length) {
                    for (let i = this.#prefs[level].length - 1; i >= 0; i--) {
                        let opt = this.#prefs[level][i];
                        if (opt === name || name.indexOf(opt) === 0) {
                            return level;
                        }
                    }
                }
            }
            return this.#deflt;
        }
    }

    /**
     * Records metrics for logging operations
     * @param {string} name - The module name
     * @param {string} level - The log level
     */
    recordMetrics(name, level) {
        if (this.#logCounter) {
            this.#logCounter.add(1, {
                module: name,
                level: level
            });
        }
    }

    /**
     * Records duration metrics for logging operations
     * @param {number} duration - Duration in seconds
     * @param {string} name - The module name
     * @param {string} level - The log level
     */
    recordDuration(duration, name, level) {
        if (this.#logDurationHistogram) {
            this.#logDurationHistogram.record(duration, {
                module: name,
                level: level
            });
        }
    }

    /**
     * Updates the logging configuration for all modules.
     * @param {Object} msg - The message containing the new logging configuration.
     * @param {string} msg.cmd - The command type, should be 'log' to trigger update.
     * @param {Object} msg.config - The configuration object mapping log levels to module lists.
     * @param {string} [msg.config.default] - The default log level for modules not explicitly listed.
     */
    updateConfig(msg) {
        var m, l, modules, i;

        if (!msg || msg.cmd !== 'log' || !msg.config) {
            return;
        }

        if (msg.config.default) {
            this.#deflt = msg.config.default;
        }

        for (m in this.#levels) {
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
                this.#levels[m] = found;
            }
            else {
                this.#levels[m] = this.#deflt;
            }
        }

        for (l in msg.config) {
            if (msg.config[l] && l !== 'default') {
                modules = msg.config[l].split(',').map(function(v) {
                    return v.trim();
                });
                this.#prefs[l] = modules;

                for (i in modules) {
                    m = modules[i];
                    if (!(m in this.#levels)) {
                        this.#levels[m] = l;
                    }
                }
            }
            else {
                this.#prefs[l] = [];
            }
        }

        this.#prefs.default = msg.config.default;
    }

    /**
     * Creates a Pino logger instance with the appropriate configuration
     * @param {string} name - The module name
     * @param {string} [level] - The log level
     * @returns {Object} Configured Pino logger instance
     */
    createPinoLogger(name, level) {
        const config = {
            name,
            level: level || this.#deflt,
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
        const prettyTransport = this.getPrettyTransport();
        if (prettyTransport) {
            return pino(config, prettyTransport);
        }
        else {
            return pino(config);
        }
    }
}

/**
 * Sub-logger class for hierarchical logging (without callback/logdb methods)
 * @class SubLogger
 */
class SubLogger {
    /** @type {string} Full module name */
    #name;

    /** @type {Object} Pino logger instance */
    #logger;

    /** @type {LogManager} Reference to the log manager */
    #manager;

    /**
     * Creates a new SubLogger instance
     * @param {string} name - The full module name (parent:child)
     * @param {LogManager} manager - The LogManager instance
     */
    constructor(name, manager) {
        this.#name = name;
        this.#manager = manager;
        manager.setLevel(name, manager.logLevel(name));
        this.#logger = manager.createPinoLogger(name, manager.getCachedLevel(name));
    }

    /**
     * Returns the full identifier of this sub-logger
     * @returns {string} Full logger identifier
     */
    id() {
        return this.#name;
    }

    /**
     * Creates a logging function for a specific level
     * @param {string} level - The log level code (d, i, w, e)
     * @returns {Function} The logging function
     * @private
     */
    #createLogFunction(level) {
        const logger = this.#logger;
        const name = this.#name;
        const manager = this.#manager;

        return function(...args) {
            const currentLevel = manager.getCachedLevel(name) || manager.getDefault();
            if (ACCEPTABLE[level].indexOf(currentLevel) !== -1) {
                const startTime = performance.now();
                const message = args[0];

                // Create span for this logging operation
                const span = createLoggingSpan(name, LEVELS[level], message);

                try {
                    // Pass all arguments directly to Pino - the logMethod hook will handle them
                    logger[LEVELS[level]](...args);

                    // Record metrics
                    manager.recordMetrics(name, LEVELS[level]);

                    // Record duration
                    const duration = (performance.now() - startTime) / 1000;
                    manager.recordDuration(duration, name, LEVELS[level]);
                }
                finally {
                    if (span) {
                        span.end();
                    }
                }
            }
        };
    }

    /**
     * Logs a debug message
     * @param {...*} args - Message and optional parameters
     */
    d(...args) {
        this.#createLogFunction('d')(...args);
    }

    /**
     * Logs an info message
     * @param {...*} args - Message and optional parameters
     */
    i(...args) {
        this.#createLogFunction('i')(...args);
    }

    /**
     * Logs a warning message
     * @param {...*} args - Message and optional parameters
     */
    w(...args) {
        this.#createLogFunction('w')(...args);
    }

    /**
     * Logs an error message
     * @param {...*} args - Message and optional parameters
     */
    e(...args) {
        this.#createLogFunction('e')(...args);
    }

    /**
     * Conditionally executes a function based on current log level
     * @param {string} l - Log level code
     * @param {Function} fn - Function to execute if level is enabled
     * @param {string} [fl] - Fallback log level
     * @param {...*} fargs - Arguments for fallback
     * @returns {boolean} True if the function was executed
     */
    f(l, fn, fl, ...fargs) {
        const currentLevel = this.#manager.getCachedLevel(this.#name) || this.#manager.getDefault();
        if (ACCEPTABLE[l].indexOf(currentLevel) !== -1) {
            fn(this.#createLogFunction(l));
            return true;
        }
        else if (fl) {
            this[fl].apply(this, fargs);
        }
    }

    /**
     * Creates a nested sub-logger
     * @param {string} subname - The nested sub-logger name
     * @returns {SubLogger} Nested sub-logger instance
     */
    sub(subname) {
        return new SubLogger(this.#name + ':' + subname, this.#manager);
    }
}

/**
 * Main Logger class for module-level logging
 * @class Logger
 */
class Logger {
    /** @type {string} Module name */
    #name;

    /** @type {Object} Pino logger instance */
    #logger;

    /** @type {LogManager} Reference to the log manager */
    #manager;

    /**
     * Creates a new Logger instance
     * @param {string} name - The module name
     * @param {LogManager} manager - The LogManager instance
     */
    constructor(name, manager) {
        this.#name = name;
        this.#manager = manager;
        manager.setLevel(name, manager.logLevel(name));
        this.#logger = manager.createPinoLogger(name, manager.getCachedLevel(name));
    }

    /**
     * Returns the identifier of this logger
     * @returns {string} Logger identifier
     */
    id() {
        return this.#name;
    }

    /**
     * Creates a logging function for a specific level
     * @param {string} level - The log level code (d, i, w, e)
     * @returns {Function} The logging function
     * @private
     */
    #createLogFunction(level) {
        const logger = this.#logger;
        const name = this.#name;
        const manager = this.#manager;

        return function(...args) {
            const currentLevel = manager.getCachedLevel(name) || manager.getDefault();
            if (ACCEPTABLE[level].indexOf(currentLevel) !== -1) {
                const startTime = performance.now();
                const message = args[0];

                // Create span for this logging operation
                const span = createLoggingSpan(name, LEVELS[level], message);

                try {
                    // Pass all arguments directly to Pino - the logMethod hook will handle them
                    logger[LEVELS[level]](...args);

                    // Record metrics
                    manager.recordMetrics(name, LEVELS[level]);

                    // Record duration
                    const duration = (performance.now() - startTime) / 1000;
                    manager.recordDuration(duration, name, LEVELS[level]);
                }
                finally {
                    if (span) {
                        span.end();
                    }
                }
            }
        };
    }

    /**
     * Logs a debug message
     * @param {...*} args - Message and optional parameters
     */
    d(...args) {
        this.#createLogFunction('d')(...args);
    }

    /**
     * Logs an info message
     * @param {...*} args - Message and optional parameters
     */
    i(...args) {
        this.#createLogFunction('i')(...args);
    }

    /**
     * Logs a warning message
     * @param {...*} args - Message and optional parameters
     */
    w(...args) {
        this.#createLogFunction('w')(...args);
    }

    /**
     * Logs an error message
     * @param {...*} args - Message and optional parameters
     */
    e(...args) {
        this.#createLogFunction('e')(...args);
    }

    /**
     * Conditionally executes a function based on current log level
     * @param {string} l - Log level code
     * @param {Function} fn - Function to execute if level is enabled
     * @param {string} [fl] - Fallback log level
     * @param {...*} fargs - Arguments for fallback
     * @returns {boolean} True if the function was executed
     */
    f(l, fn, fl, ...fargs) {
        const currentLevel = this.#manager.getCachedLevel(this.#name) || this.#manager.getDefault();
        if (ACCEPTABLE[l].indexOf(currentLevel) !== -1) {
            fn(this.#createLogFunction(l));
            return true;
        }
        else if (fl) {
            this[fl].apply(this, fargs);
        }
    }

    /**
     * Creates a callback function that logs errors
     * @param {Function} [next] - Function to call on success
     * @returns {Function} Callback function
     */
    callback(next) {
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
    }

    /**
     * Creates a database operation callback that logs results
     * @param {string} opname - Operation name
     * @param {Function} [next] - Function to call on success
     * @param {Function} [nextError] - Function to call on error
     * @returns {Function} Database callback function
     */
    logdb(opname, next, nextError) {
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
    }

    /**
     * Creates a sub-logger with the current logger's name as prefix
     * @param {string} subname - The sub-logger name
     * @returns {SubLogger} Sub-logger instance
     */
    sub(subname) {
        return new SubLogger(this.#name + ':' + subname, this.#manager);
    }
}

// Create the singleton manager instance
const manager = LogManager.getInstance();

/**
 * Factory function for creating logger instances (backward compatible)
 * @param {string} name - The module name
 * @returns {Logger} Logger instance
 */
const logFactory = function(name) {
    return new Logger(name, manager);
};

// Attach static methods for backward compatibility
/**
 * Sets logging level for a specific module
 * @param {string} module - The module name
 * @param {string} level - The log level
 * @returns {void}
 */
logFactory.setLevel = (module, level) => manager.setLevel(module, level);

/**
 * Sets default logging level for all modules without explicit configuration
 * @param {string} level - The log level
 * @returns {void}
 */
logFactory.setDefault = (level) => manager.setDefault(level);

/**
 * Sets pretty-print option for all loggers
 * @param {boolean} enabled - Whether to enable pretty-print
 * @returns {void}
 */
logFactory.setPrettyPrint = (enabled) => manager.setPrettyPrint(enabled);

/**
 * Gets current logging level for a module
 * @param {string} [module] - The module name
 * @returns {string} The current log level
 */
logFactory.getLevel = (module) => manager.getLevel(module);

/**
 * Indicates if OpenTelemetry integration is available
 * @type {boolean}
 */
logFactory.hasOpenTelemetry = Boolean(trace && metrics);

/**
 * Updates the logging configuration for all modules.
 * @param {Object} msg - The message containing the new logging configuration.
 * @param {string} msg.cmd - The command type, should be 'log' to trigger update.
 * @param {Object} msg.config - The configuration object mapping log levels to module lists.
 * @param {string} [msg.config.default] - The default log level for modules not explicitly listed.
 * @returns {void}
 */
logFactory.updateConfig = (msg) => manager.updateConfig(msg);

module.exports = logFactory;
