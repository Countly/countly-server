/** Log level types */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogLevelShort = 'd' | 'i' | 'w' | 'e';

/** Logging configuration structure */
export interface LoggingConfig {
    [level: string]: string[] | string | LogLevel | undefined;
    default?: LogLevel;
}

/** IPC message for log configuration */
export interface LogIpcMessage {
    cmd: string;
    config: {
        [level: string]: string;
        default?: string;
    };
}

/**
 * Sub-logger instance (without callback/logdb methods)
 */
export interface SubLogger {
    /**
     * Returns the sub-logger's full module name/identifier
     * @returns Full module name string (parent:child)
     */
    id(): string;

    /**
     * Debug level logging
     * @param args - Arguments to log
     */
    d(...args: any[]): void;

    /**
     * Info level logging
     * @param args - Arguments to log
     */
    i(...args: any[]): void;

    /**
     * Warning level logging
     * @param args - Arguments to log
     */
    w(...args: any[]): void;

    /**
     * Error level logging
     * @param args - Arguments to log
     */
    e(...args: any[]): void;

    /**
     * Conditional logging for expensive operations
     * @param level - Log level to check
     * @param fn - Function to execute if logging is enabled
     * @param fallbackLevel - Fallback log level if primary level not enabled
     * @param fallbackArgs - Arguments for fallback logging
     * @returns True if logging occurred
     */
    f(level: LogLevelShort, fn: (log: (...args: any[]) => void) => void, fallbackLevel?: LogLevelShort, ...fallbackArgs: any[]): boolean | undefined;

    /**
     * Creates a nested sub-logger with extended name
     * @param subname - Sub-module name to append
     * @returns New sub-logger instance
     */
    sub(subname: string): SubLogger;
}

/**
 * Logger instance for a specific module
 */
export interface Logger extends SubLogger {
    /**
     * Creates error-logging callback wrapper
     * @param next - Optional success callback function
     * @returns Node.js style callback function
     */
    callback(next?: Function): (err: any, ...args: any[]) => void;

    /**
     * Creates database operation callback with logging
     * @param opname - Operation name for logging
     * @param next - Optional success callback function
     * @param nextError - Optional error callback function
     * @returns Node.js style callback function
     */
    logdb(opname: string, next?: Function, nextError?: Function): (err: any, ...args: any[]) => void;

    /**
     * Creates a sub-logger with extended name
     * @param subname - Sub-module name to append
     * @returns New sub-logger instance
     */
    sub(subname: string): SubLogger;
}

/**
 * Log module factory function and utilities
 */
export interface LogModule {
    /**
     * Create a logger instance for a specific module
     * @param name - Module name (supports colon-separated hierarchical names)
     * @returns Logger instance
     */
    (name: string): Logger;

    /**
     * Sets logging level for specific module
     * @param module - Module name (supports wildcards)
     * @param level - Log level to set
     */
    setLevel(module: string, level: LogLevel): void;

    /**
     * Sets default logging level for all modules
     * @param level - Default log level
     */
    setDefault(level: LogLevel): void;

    /**
     * Gets current logging level for a module
     * @param module - Module name (optional, returns default if not provided)
     * @returns Current log level
     */
    getLevel(module?: string): string;

    /**
     * Sets pretty-print option for all loggers
     * @param enabled - Whether to enable pretty-print
     */
    setPrettyPrint(enabled: boolean): void;

    /**
     * Updates the logging configuration for all modules
     * @param msg - IPC message with log configuration
     */
    updateConfig(msg: LogIpcMessage): void;

    /**
     * Indicates if OpenTelemetry integration is available
     */
    hasOpenTelemetry: boolean;

    /**
     * Shuts down the LogManager, closing any open transports and resetting the singleton.
     * Primarily used for testing to ensure clean module reloads.
     */
    shutdown(): void;
}

/**
 * Log module factory function
 */
declare const log: LogModule;
export default log;
