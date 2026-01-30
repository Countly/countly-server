import pino from 'pino';
import type { Logger } from 'pino';
import { createRequire } from 'module';

// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

// Optional OpenTelemetry imports
let trace: typeof import('@opentelemetry/api').trace | undefined;
let context: typeof import('@opentelemetry/api').context | undefined;
let metrics: typeof import('@opentelemetry/api').metrics | undefined;
let semanticConventions: typeof import('@opentelemetry/semantic-conventions') | undefined;
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

type LogLevelCode = 'd' | 'i' | 'w' | 'e';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggingConfig {
    debug?: string | string[];
    info?: string | string[];
    warn?: string | string[];
    error?: string | string[];
    default?: string;
    prettyPrint?: boolean;
    [key: string]: string | string[] | boolean | undefined;
}

interface UpdateConfigMessage {
    cmd?: string;
    config?: {
        default?: string;
        [key: string]: string | undefined;
    };
}

/**
 * Mapping of short level codes to full level names
 */
const LEVELS: Record<LogLevelCode, LogLevel> = {
    d: 'debug',
    i: 'info',
    w: 'warn',
    e: 'error'
};

/**
 * Mapping of log levels to acceptable log levels
 */
const ACCEPTABLE: Record<LogLevelCode, LogLevel[]> = {
    d: ['debug'],
    i: ['debug', 'info'],
    w: ['debug', 'info', 'warn'],
    e: ['debug', 'info', 'warn', 'error'],
};


/**
 * Load logging configuration from environment variables or config file
 * Environment variables take precedence over config.js values
 * Format: COUNTLY_SETTINGS__LOGS__<KEY> where KEY is DEBUG, INFO, WARN, ERROR, DEFAULT, or PRETTYPRINT
 * @returns Logging configuration object with debug, info, warn, error, default, and prettyPrint properties
 */
function loadLoggingConfig(): LoggingConfig {
    // Start with config.js values
    const prefs: LoggingConfig = (require('../config.js') as { logging?: LoggingConfig }).logging || {};

    // Check for environment variable overrides
    const envDebug = process.env.COUNTLY_SETTINGS__LOGS__DEBUG;
    const envInfo = process.env.COUNTLY_SETTINGS__LOGS__INFO;
    const envWarn = process.env.COUNTLY_SETTINGS__LOGS__WARN;
    const envError = process.env.COUNTLY_SETTINGS__LOGS__ERROR;
    const envDefault = process.env.COUNTLY_SETTINGS__LOGS__DEFAULT;
    const envPrettyPrint = process.env.COUNTLY_SETTINGS__LOGS__PRETTYPRINT;

    /**
     * Helper to parse environment variable as array
     * @param envValue - Environment variable value
     * @returns Parsed array of module names
     */
    const parseEnvArray = (envValue: string): string[] => {
        try {
            return JSON.parse(envValue);
        }
        catch (e) {
            return envValue.split(',').map(s => s.trim()).filter(s => s.length > 0);
        }
    };

    /**
     * Helper to remove modules from other log levels to avoid conflicts
     * @param modules - Array of module names
     * @param currentLevel - The level being set
     */
    const removeFromOtherLevels = (modules: string[], currentLevel: string): void => {
        const levels = ['debug', 'info', 'warn', 'error'];
        for (const level of levels) {
            if (level !== currentLevel && Array.isArray(prefs[level])) {
                prefs[level] = (prefs[level] as string[]).filter(m => !modules.includes(m));
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

// Initialize configuration with defaults
const prefs = loadLoggingConfig();
prefs.default = prefs.default || "warn";
let deflt = (prefs && prefs.default) ? prefs.default : 'error';
let prettyPrint = prefs.prettyPrint || false;

// Singleton transport for pretty-print to avoid memory leaks
let prettyTransport: pino.DestinationStream | null = null;

/**
 * Current levels for all modules
 */
const levels: Record<string, string> = {};

// Metrics setup if OpenTelemetry is available
interface MetricCounter { add: (value: number, attributes?: Record<string, unknown>) => void }
interface MetricHistogram { record: (value: number, attributes?: Record<string, unknown>) => void }
let logCounter: MetricCounter | undefined;
let logDurationHistogram: MetricHistogram | undefined;

if (metrics) {
    const meter = metrics.getMeter('logger');
    logCounter = meter.createCounter('log_entries_total', {
        description: 'Number of log entries by level and module',
    }) as unknown as MetricCounter;
    logDurationHistogram = meter.createHistogram('log_duration_seconds', {
        description: 'Duration of logging operations',
    }) as unknown as MetricHistogram;
}

interface TraceContext {
    traceId: string;
    spanId: string;
    traceFlags: string;
}

/**
 * Gets the current trace context if OpenTelemetry is available
 * @returns Trace context object or null if unavailable
 */
function getTraceContext(): TraceContext | null {
    if (!trace || !context) {
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

interface Span {
    end: () => void;
}

/**
 * Creates a logging span if OpenTelemetry is available
 * @param name - The module name
 * @param level - The log level
 * @param message - The log message
 * @returns The created span or null if unavailable
 */
function createLoggingSpan(name: string, level: string, message: unknown): Span | null {
    if (!trace || !semanticConventions) {
        return null;
    }

    const tracer = trace.getTracer('logger');
    const semConv = semanticConventions as unknown as Record<string, Record<string, string>>;
    const codeFunction = semConv.SemanticAttributes?.CODE_FUNCTION || 'code.function';
    const codeNamespace = semConv.SemanticAttributes?.CODE_NAMESPACE || 'code.namespace';

    return tracer.startSpan(`log.${level}`, {
        attributes: {
            [codeFunction]: name,
            [codeNamespace]: 'logger',
            'logging.level': level,
            'logging.message': String(message)
        }
    });
}

/**
 * Records metrics for logging operations
 * @param name - The module name
 * @param level - The log level
 */
function recordMetrics(name: string, level: string): void {
    if (logCounter) {
        logCounter.add(1, {
            module: name,
            level: level
        });
    }
}

/**
 * Looks for logging level in config for a particular module
 * @param name - The module name
 * @returns The configured log level
 */
const logLevel = function(name: string): string {
    if (prefs === undefined) {
        return 'error';
    }
    else if (typeof prefs === 'string') {
        return prefs;
    }
    else {
        // Check log levels in priority order (most verbose first)
        const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

        for (const level of validLevels) {
            if (!prefs[level]) {
                continue;
            }

            if (typeof prefs[level] === 'string' && name.indexOf(prefs[level] as string) === 0) {
                return level;
            }
            if (typeof prefs[level] === 'object' && Array.isArray(prefs[level]) && (prefs[level] as string[]).length > 0) {
                const prefLevel = prefs[level] as string[];
                for (let i = prefLevel.length - 1; i >= 0; i--) {
                    const opt = prefLevel[i];
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
 * @param name - The module name
 * @param level - The log level
 * @returns Configured Pino logger instance
 */
const createLogger = (name: string, level?: string): Logger => {
    const config: pino.LoggerOptions = {
        name,
        level: level || deflt,
        timestamp: pino.stdTimeFunctions.isoTime,
        hooks: {
            logMethod(args: unknown[], method: pino.LogFn) {
                if (args.length > 1) {
                    // Create an object with all arguments in order
                    const logObj: Record<string, unknown> = {};
                    let messageArg: string | null = null;

                    for (const [i, arg] of args.entries()) {
                        const key = `arg${i}`;

                        if (typeof arg === 'object' && arg !== null) {
                            if (arg instanceof Error) {
                                // Store error with full stack trace
                                logObj[key] = {
                                    name: arg.name,
                                    message: arg.message,
                                    stack: arg.stack,
                                    // Include any custom properties
                                    ...Object.getOwnPropertyNames(arg).reduce((acc: Record<string, unknown>, prop) => {
                                        if (!['name', 'message', 'stack'].includes(prop)) {
                                            acc[prop] = (arg as unknown as Record<string, unknown>)[prop];
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
                    method.apply(this, args as [string]);
                }
            }
        },
        formatters: {
            level: (label: string) => {
                return { level: label.toUpperCase() };
            },
            log: (object: Record<string, unknown>) => {
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
        return pino(config, prettyTransport as pino.DestinationStream);
    }
    else {
        return pino(config);
    }
};

type LogFunction = (...args: unknown[]) => void;

/**
 * Creates a logging function for a specific level
 * @param logger - The Pino logger instance
 * @param name - The module name
 * @param level - The log level code (d, i, w, e)
 * @returns The logging function
 */
const createLogFunction = (logger: Logger, name: string, level: LogLevelCode): LogFunction => {
    return function(...args: unknown[]): void {
        const currentLevel = levels[name] || deflt;
        if (ACCEPTABLE[level].includes(currentLevel as LogLevel)) {
            const startTime = performance.now();
            const message = args[0];

            // Create span for this logging operation
            const span = createLoggingSpan(name, LEVELS[level], message);

            try {
                // Pass all arguments directly to Pino - the logMethod hook will handle them
                (logger[LEVELS[level]] as LogFunction)(...args);

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
 * @param module - The module name
 * @param level - The log level
 */
const setLevel = function(module: string, level: string): void {
    levels[module] = level;
};

/**
 * Sets default logging level
 * @param level - The log level
 */
const setDefault = function(level: string): void {
    deflt = level;
};

/**
 * Sets pretty-print option
 * @param enabled - Whether to enable pretty-print
 */
const setPrettyPrint = function(enabled: boolean): void {
    prettyPrint = enabled;

    // Reset transport when changing pretty-print setting
    if (prettyTransport) {
        (prettyTransport as NodeJS.WritableStream).end?.();
        prettyTransport = null;
    }
};

/**
 * Gets current logging level for a module
 * @param module - The module name
 * @returns The current log level
 */
const getLevel = function(module?: string): string {
    if (module) {
        // If not in cache, compute it from config
        if (!(module in levels)) {
            return logLevel(module);
        }
        return levels[module];
    }
    return deflt;
};

interface SubLogger {
    id: () => string;
    d: LogFunction;
    i: LogFunction;
    w: LogFunction;
    e: LogFunction;
    f: (l: LogLevelCode, fn: (log: LogFunction) => void, fl?: LogLevelCode, ...fargs: unknown[]) => boolean | void;
    sub: (subname: string) => SubLogger;
}

interface CountlyLogger extends SubLogger {
    callback: (next?: (...args: unknown[]) => void) => (err?: Error | null, ...args: unknown[]) => void;
    logdb: (opname: string, next?: (...args: unknown[]) => void, nextError?: (err: Error) => void) => (err?: Error | null, ...args: unknown[]) => void;
}

/**
 * Creates a new logger instance
 * @param name - The module name
 * @returns Logger instance with various methods
 */
function createCountlyLogger(name: string): CountlyLogger {
    setLevel(name, logLevel(name));
    const logger = createLogger(name, levels[name]);

    /**
     * Creates a sub-logger with the parent's name as prefix
     * @param subname - The sub-logger name
     * @returns Sub-logger instance
     */
    const createSubLogger = (subname: string): SubLogger => {
        const full = name + ':' + subname;
        setLevel(full, logLevel(full));
        const subLogger = createLogger(full, levels[full]);

        const subLoggerInstance: SubLogger = {
            /**
             * Returns the full identifier of this sub-logger
             * @returns Full logger identifier
             */
            id: () => full,

            /**
             * Logs a debug message
             * @param args - Message and optional parameters
             */
            d: createLogFunction(subLogger, full, 'd'),

            /**
             * Logs an info message
             * @param args - Message and optional parameters
             */
            i: createLogFunction(subLogger, full, 'i'),

            /**
             * Logs a warning message
             * @param args - Message and optional parameters
             */
            w: createLogFunction(subLogger, full, 'w'),

            /**
             * Logs an error message
             * @param args - Message and optional parameters
             */
            e: createLogFunction(subLogger, full, 'e'),

            /**
             * Conditionally executes a function based on current log level
             * @param l - Log level code
             * @param fn - Function to execute if level is enabled
             * @param fl - Fallback log level
             * @param fargs - Arguments for fallback
             * @returns True if the function was executed
             */
            f: function(l: LogLevelCode, fn: (log: LogFunction) => void, fl?: LogLevelCode, ...fargs: unknown[]): boolean | void {
                if (ACCEPTABLE[l].includes((levels[full] || deflt) as LogLevel)) {
                    fn(createLogFunction(subLogger, full, l));
                    return true;
                }
                else if (fl) {
                    (this[fl] as LogFunction).apply(this, fargs);
                }
            },

            /**
             * Creates a nested sub-logger
             * @param subname - The nested sub-logger name
             * @returns Nested sub-logger instance
             */
            sub: createSubLogger
        };

        return subLoggerInstance;
    };

    const loggerInstance: CountlyLogger = {
        /**
         * Returns the identifier of this logger
         * @returns Logger identifier
         */
        id: () => name,

        /**
         * Logs a debug message
         * @param args - Message and optional parameters
         */
        d: createLogFunction(logger, name, 'd'),

        /**
         * Logs an info message
         * @param args - Message and optional parameters
         */
        i: createLogFunction(logger, name, 'i'),

        /**
         * Logs a warning message
         * @param args - Message and optional parameters
         */
        w: createLogFunction(logger, name, 'w'),

        /**
         * Logs an error message
         * @param args - Message and optional parameters
         */
        e: createLogFunction(logger, name, 'e'),

        /**
         * Conditionally executes a function based on current log level
         * @param l - Log level code
         * @param fn - Function to execute if level is enabled
         * @param fl - Fallback log level
         * @param fargs - Arguments for fallback
         * @returns True if the function was executed
         */
        f: function(l: LogLevelCode, fn: (log: LogFunction) => void, fl?: LogLevelCode, ...fargs: unknown[]): boolean | void {
            if (ACCEPTABLE[l].includes((levels[name] || deflt) as LogLevel)) {
                fn(createLogFunction(logger, name, l));
                return true;
            }
            else if (fl) {
                (this[fl] as LogFunction).apply(this, fargs);
            }
        },

        /**
         * Creates a callback function that logs errors
         * @param next - Function to call on success
         * @returns Callback function
         */
        callback: function(next?: (...args: unknown[]) => void): (err?: Error | null, ...args: unknown[]) => void {
            const self = this;
            return function(this: unknown, err?: Error | null, ...args: unknown[]): void {
                if (err) {
                    self.e(err);
                }
                else if (next) {
                    next.apply(this, args);
                }
            };
        },

        /**
         * Creates a database operation callback that logs results
         * @param opname - Operation name
         * @param next - Function to call on success
         * @param nextError - Function to call on error
         * @returns Database callback function
         */
        logdb: function(opname: string, next?: (...args: unknown[]) => void, nextError?: (err: Error) => void): (err?: Error | null, ...args: unknown[]) => void {
            const self = this;
            return function(this: unknown, err?: Error | null, ...args: unknown[]): void {
                if (err) {
                    self.e('Error while %j: %j', opname, err);
                    if (nextError) {
                        nextError(err);
                    }
                }
                else {
                    self.d('Done %j', opname);
                    if (next) {
                        next.apply(this, args);
                    }
                }
            };
        },

        /**
         * Creates a sub-logger with the current logger's name as prefix
         * @param subname - The sub-logger name
         * @returns Sub-logger instance
         */
        sub: createSubLogger
    };

    return loggerInstance;
}

/**
 * Updates the logging configuration for all modules.
 *
 * @param msg - The message containing the new logging configuration.
 * @param msg.cmd - The command type, should be 'log' to trigger update.
 * @param msg.config - The configuration object mapping log levels to module lists.
 * @param msg.config.default - The default log level for modules not explicitly listed.
 *
 * This function updates the internal logging levels and preferences based on the provided configuration.
 * It is typically used to dynamically adjust logging settings at runtime.
 */
function updateConfig(msg: UpdateConfigMessage): void {
    let m: string, l: string, modules: string[], i: number;

    if (!msg || msg.cmd !== 'log' || !msg.config) {
        return;
    }

    // console.log('%d: Setting logging config to %j (was %j)', process.pid, msg.config, levels);

    if (msg.config.default) {
        deflt = msg.config.default;
    }

    for (m in levels) {
        let found: string | null = null;
        for (l in msg.config) {
            if (!msg.config[l]) {
                continue;
            }
            modules = msg.config[l]!.split(',').map(function(v: string) {
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
                if (!msg.config[l]) {
                    continue;
                }
                modules = msg.config[l]!.split(',').map(function(v: string) {
                    return v.trim();
                });

                for (i = 0; i < modules.length; i++) {
                    if (!modules[i].includes('*') && modules[i] === m.split(':')[0]) {
                        found = l;
                    }
                    else if (modules[i].includes('*') && modules[i].split(':')[1] === '*' && modules[i].split(':')[0] === m.split(':')[0]) {
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
            modules = msg.config[l]!.split(',').map(function(v: string) {
                return v.trim();
            });
            prefs[l] = modules;

            for (i = 0; i < modules.length; i++) {
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
}

// Create the module export with static methods attached
interface LogModule {
    (name: string): CountlyLogger;
    setLevel: typeof setLevel;
    setDefault: typeof setDefault;
    setPrettyPrint: typeof setPrettyPrint;
    getLevel: typeof getLevel;
    hasOpenTelemetry: boolean;
    updateConfig: typeof updateConfig;
}

const logModule = createCountlyLogger as LogModule;
logModule.setLevel = setLevel;
logModule.setDefault = setDefault;
logModule.setPrettyPrint = setPrettyPrint;
logModule.getLevel = getLevel;
logModule.hasOpenTelemetry = Boolean(trace && metrics);
logModule.updateConfig = updateConfig;

export default logModule;
export { setLevel, setDefault, setPrettyPrint, getLevel, updateConfig };
