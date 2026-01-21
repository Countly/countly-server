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
    config: any;
}

/**
 * Logger instance for a specific module
 */
export interface Logger {
    /**
     * Returns the logger's module name/identifier
     * @returns Module name string
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
     * Warning level logging (with yellow styling)
     * @param args - Arguments to log
     */
    w(...args: any[]): void;

    /**
     * Error level logging (with red styling)
     * @param args - Arguments to log
     */
    e(...args: any[]): void;

    /** Allow any additional properties for legacy compatibility */
    [key: string]: any;

    /**
     * Conditional logging for expensive operations
     * @param level - Log level to check
     * @param fn - Function to execute if logging is enabled
     * @param fallbackLevel - Fallback log level if function throws
     * @param fallbackArgs - Arguments for fallback logging
     * @returns True if logging occurred
     */
    f(level: LogLevelShort, fn: (log: Function) => void, fallbackLevel?: LogLevelShort, ...fallbackArgs: any[]): boolean;

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
     * @returns New logger instance
     */
    sub(subname: string): Logger;
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
     * @param module - Module name
     * @returns Current log level
     */
    getLevel(module: string): string;

    /**
     * Handles IPC messages for log configuration
     * @param msg - IPC message with log configuration
     */
    ipcHandler(msg: LogIpcMessage): void;
}

/**
 * Log module factory function
 */
declare const log: LogModule;
export default log;