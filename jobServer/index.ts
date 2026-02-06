/**
 * Entry point for Countly's job management system
 * @module jobServer
 * @version 2.0
 * @author Countly
 *
 * @note
 * Dependencies like common utilities and plugin manager should only be imported in this entry file
 * and injected into the respective modules via their constructors or create methods.
 *
 * @description
 * This module serves as the entry point for Countly's job management system.
 * It provides a robust infrastructure for:
 * - Scheduling and executing background tasks
 * - Managing job lifecycles and states
 * - Handling job dependencies and priorities
 * - Providing process isolation for job execution
 *
 * @exports {Object} module.exports
 * @property {JobType} Job - Class for creating and managing individual jobs
 * @property {JobServerType} JobServer - Class for running jobs in a separate process
 *
 * @throws {Error} DatabaseConnectionError When database connection fails during initialization
 * @throws {Error} InvalidJobError When job definition is invalid
 *
 * @example
 * // Import and create a new job
 * const { Job } = require('./jobs');
 * const job = new Job({
 *   name: 'example',
 *   type: 'report',
 *   schedule: '0 0 * * *'
 * });
 * Proxy file - re-exports from TypeScript implementation
 */

import type { Db } from 'mongodb';
import type { IncomingMessage, ServerResponse } from 'http';

import { createRequire } from 'module';
// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

const http = require('http');
const formidable = require('formidable');

const countlyConfig = require('../api/config');
const jobServerConfig = require('./config');
const JobServer = require('./JobServer');
const Logger = require('../api/utils/log.js');
const log: JobLogger = new Logger('jobServer:index');
const { ReadBatcher, WriteBatcher, InsertBatcher } = require('../api/parts/data/batcher');
const common = require('../api/utils/common.js');
const QueryRunner = require('../api/parts/data/QueryRunner.js');
const { MongoDbQueryRunner } = require('../api/utils/mongoDbQueryRunner.js');
const pluginManager = require('../plugins/pluginManager.ts');
require('../api/init_configs.js');

const { processRequest } = require('./requestProcessor');

// ----------------------------------
// Type Definitions
// ----------------------------------

interface JobLogger {
    d(...args: unknown[]): void;
    w(...args: unknown[]): void;
    e(...args: unknown[]): void;
    i(...args: unknown[]): void;
}

interface DbConnections {
    countlyDb: Db;
    drillDb?: Db;
    outDb?: Db;
    fsDb?: Db;
    [key: string]: Db | undefined;
}

interface JobServerInstance {
    start(): Promise<void>;
    shutdown(exitCode?: number): Promise<void>;
    applyConfig(jobConfig: Record<string, unknown>): Promise<void>;
}

interface RequestParams {
    qstring: Record<string, unknown>;
    res: ServerResponse;
    req: IncomingMessage;
    files?: Record<string, unknown>;
    formDataUrl?: string;
    apiPath?: string;
    [key: string]: unknown;
}

interface FormidableOptions {
    maxFileSize?: number;
}

interface FormidableFile {
    filepath?: string;
    path?: string;
    mimetype?: string;
    type?: string;
    originalFilename?: string;
    name?: string;
}

interface CountlyConfig {
    api: {
        max_sockets?: number;
        maxUploadFileSize?: number;
        [key: string]: unknown;
    };
    jobServer?: {
        maxUploadFileSize?: number;
        port?: number;
        host?: string;
        timeout?: number;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

interface FormidableForm {
    parse(
        req: IncomingMessage,
        callback: (err: Error | null, fields: Record<string, unknown>, files: Record<string, FormidableFile>) => void
    ): void;
}

// Start the process if this file is run directly
if (require.main === module) {
    /**
     * Handle incoming HTTP/HTTPS requests
     */
    const handleRequest = function(req: IncomingMessage, res: ServerResponse) {
        const params: RequestParams = {
            qstring: {},
            res: res,
            req: req
        };

        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Keep-Alive', 'timeout=5, max=1000');

        if (req.method?.toLowerCase() === 'post') {
            const formidableOptions: FormidableOptions = {};
            if ((countlyConfig as CountlyConfig).api.maxUploadFileSize) {
                formidableOptions.maxFileSize = (countlyConfig as CountlyConfig).jobServer?.maxUploadFileSize;
            }

            const form: FormidableForm = new formidable.IncomingForm(formidableOptions);
            (req as IncomingMessage & { body: string }).body = '';
            req.on('data', (data: Buffer) => {
                (req as IncomingMessage & { body: string }).body += data;
            });

            let multiFormData = false;
            // Check if we have 'multipart/form-data'
            if (req.headers['content-type']?.startsWith('multipart/form-data')) {
                multiFormData = true;
            }

            form.parse(req, (_: Error | null, fields: Record<string, unknown>, files: Record<string, FormidableFile>) => {
                //handle backwards compatibility with formidable v1
                for (const i in files) {
                    if (files[i].filepath) {
                        files[i].path = files[i].filepath;
                    }
                    if (files[i].mimetype) {
                        files[i].type = files[i].mimetype;
                    }
                    if (files[i].originalFilename) {
                        files[i].name = files[i].originalFilename;
                    }
                }
                params.files = files;
                if (multiFormData) {
                    const formDataUrl: string[] = [];
                    for (const i in fields) {
                        params.qstring[i] = fields[i];
                        formDataUrl.push(`${i}=${fields[i]}`);
                    }
                    params.formDataUrl = formDataUrl.join('&');
                }
                else {
                    for (const i in fields) {
                        params.qstring[i] = fields[i];
                    }
                }
                if (!params.apiPath) {
                    processRequest(params);
                }
            });
        }
        else if (req.method?.toLowerCase() === 'options') {
            const headers: Record<string, string> = {};
            headers['Access-Control-Allow-Origin'] = '*';
            headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
            headers['Access-Control-Allow-Headers'] = 'countly-token, Content-Type';
            res.writeHead(200, headers);
            res.end();
        }
        //attempt process GET request
        else if (req.method?.toLowerCase() === 'get') {
            processRequest(params);
        }
        else {
            common.returnMessage(params, 405, 'Method not allowed');
        }
    };

    let jobServer: JobServerInstance | null = null;

    log.i('Initializing job server process...');

    /**
     * Initialize configuration and database connections
     */
    const initializeSystem = async(): Promise<{ config: unknown; dbConnections: DbConnections }> => {
        try {
            // Use connectToAllDatabases which handles config loading and db connections
            const [countlyDb, outDb, fsDb, drillDb] = await pluginManager.connectToAllDatabases() as [Db, Db, Db, Db];

            log.d('Initializing batchers for job server...');
            try {
                common.writeBatcher = new WriteBatcher(countlyDb);
                common.readBatcher = new ReadBatcher(countlyDb);
                common.insertBatcher = new InsertBatcher(countlyDb);
                common.queryRunner = new QueryRunner();
                console.log('✓ Batchers and QueryRunner initialized');

                // Initialize drill-specific batchers if drillDb is available
                if (drillDb) {
                    common.drillReadBatcher = new ReadBatcher(drillDb, { configs_db: countlyDb });
                    common.drillQueryRunner = new MongoDbQueryRunner(common.drillDb);
                    console.log('✓ Drill database components initialized');
                }
            }
            catch (batcherError) {
                const err = batcherError as Error;
                log.e('Failed to initialize batchers:', {
                    error: err.message,
                    stack: err.stack
                });
                throw new Error('Batcher initialization failed: ' + err.message);
            }

            const config: unknown = await new Promise<void>((resolve, reject) => {
                pluginManager.loadConfigs(countlyDb, (err: Error | null) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve();
                    }
                });
            });
            log.d('Configuration initialized successfully');

            console.log('=== INITIALIZING PLUGINS ===');
            pluginManager.init();
            console.log('✓ Plugins initialized');

            return {
                config,
                dbConnections: {
                    countlyDb,
                    drillDb,
                    outDb,
                    fsDb
                }
            };
        }
        catch (error) {
            const err = error as Error;
            log.e('Failed to initialize system:', {
                error: err.message,
                stack: err.stack
            });
            throw new Error('System initialization failed: ' + err.message);
        }
    };

    initializeSystem()
        .then(async({ dbConnections }) => {
            log.i('Starting job server initialization sequence...');

            // if resumeOnRestart is true, all scheduled jobs lastRunAt will be deleted when starting the job server
            // lastRunAt for all scheduled jobs have to be preserved in order to calculate lastRunDuration
            if (jobServerConfig.PULSE.resumeOnRestart === true) {
                await dbConnections.countlyDb.collection(jobServerConfig.PULSE.db.collection).updateMany(
                    { type: 'single', lastRunAt: { $exists: true } },
                    [
                        { $set: { lastRunAtCpy: '$lastRunAt' } },
                    ],
                );
            }

            jobServer = await JobServer.create(Logger, pluginManager, dbConnections) as JobServerInstance;

            log.i('Job server successfully created, starting process...');
            await jobServer.start();
            log.i('Job server successfully started');

            common.jobServer = jobServer;

            /**
            * Set Max Sockets
            */
            http.globalAgent.maxSockets = (countlyConfig as CountlyConfig).api.max_sockets || 1024;
            console.log('=== CREATING SERVER ===');
            console.log('common.config.jobServer:', JSON.stringify(common.config.jobServer, null, 2));
            const serverOptions = {
                port: common.config?.jobServer?.port || 3020,
                host: common.config?.jobServer?.host || '',
            };
            console.log('Server options:', serverOptions);
            const server = http.createServer(handleRequest);
            console.log('Starting server on', serverOptions.host + ':' + serverOptions.port);
            server.listen(serverOptions.port, serverOptions.host, () => {
                console.log('✓ Server listening on', serverOptions.host + ':' + serverOptions.port);
            });

            server.timeout = common.config?.jobServer?.timeout || 120000;
            server.keepAliveTimeout = common.config?.jobServer?.timeout || 120000;
            server.headersTimeout = (common.config?.jobServer?.timeout || 120000) + 1000; // Slightly higher
            console.log('✓ Server timeouts configured:', {
                timeout: server.timeout,
                keepAliveTimeout: server.keepAliveTimeout,
                headersTimeout: server.headersTimeout
            });
        })
        .catch((error: Error) => {
            log.e('Critical error during job server initialization:', {
                error: error.message,
                stack: error.stack,
                type: error.constructor.name,
                time: new Date().toISOString()
            });
            if (require.main === module) {
                log.e('Exiting process due to critical initialization error');
                process.exit(1);
            }
        });

    if (require.main === module) {
        /**
        *  Handle exit events for graceful close
        */
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT', 'SIGBUS', 'SIGFPE', 'SIGSEGV', 'SIGTERM'].forEach(signal => {
            process.on(signal, () => {
                log.i(`Received ${signal}, initiating graceful shutdown...`);
                if (jobServer && typeof jobServer.shutdown === 'function') {
                    jobServer.shutdown();
                }
                else {
                    setTimeout(() => {
                        log.e('Forced shutdown after timeout');
                        process.exit(1);
                    }, 3000);
                }
            });
        });

        /**
        * Uncaught Exception Handler
        */
        process.on('uncaughtException', (err: Error) => {
            console.log('Caught exception: %j', err, err.stack);
            if (log && log.e) {
                log.e('Logging caught exception');
            }
            console.trace();
        });

        /**
        * Unhandled Rejection Handler
        */
        process.on('unhandledRejection', (reason: Error | undefined, p: Promise<unknown>) => {
            console.log('Unhandled rejection for %j with reason %j stack', p, reason, reason ? reason.stack : undefined);
            if (log && log.e) {
                log.e('Logging unhandled rejection');
            }
            console.trace();
        });
    }
}

/**
 * Keeping old interface for backward compatibility
 */
const Job = require('./Job');
export { Job };
export default { Job };
