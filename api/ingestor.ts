/**
 * Ingestor entry point - handles incoming HTTP requests for data ingestion
 * @module api/ingestor
 */

import type { IncomingMessage, ServerResponse } from 'http';

import http from 'http';
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const formidable = require('formidable');
const countlyConfig = require('./config.js');
const plugins = require('../plugins/pluginManager.js');
const logModule = require('./utils/log.js');
const { processRequest } = require('./ingestor/requestProcessor.js');
const common = require('./utils/common.js');
const { Cacher } = require('./parts/data/cacher.js');
const { WriteBatcher } = require('./parts/data/batcher.js');
require('./init_configs.js');

const log = logModule('ingestor-core:api') as { i: (...args: unknown[]) => void; e: (...args: unknown[]) => void; d: (...args: unknown[]) => void; w: (...args: unknown[]) => void };

/**
 * Extended IncomingMessage with body property
 */
interface IngestorRequest extends IncomingMessage {
    body?: string | Buffer[];
}

/**
 * Request parameters for ingestor processing
 */
interface IngestorParams {
    qstring: Record<string, unknown>;
    res: ServerResponse;
    req: IngestorRequest;
    tt?: number;
    files?: Record<string, FormidableFile>;
    formDataUrl?: string;
    apiPath?: string;
}

/**
 * Formidable file interface
 */
interface FormidableFile {
    filepath?: string;
    path?: string;
    mimetype?: string;
    type?: string;
    originalFilename?: string;
    name?: string;
}

/**
 * Formidable options interface
 */
interface FormidableOptions {
    maxFileSize?: number;
}

const t = ['countly:', 'ingestor'];
t.push('node');

// Finally set the visible title
process.title = t.join(' ');

console.log('Connecting to databases');

// Overriding function
plugins.loadConfigs = plugins.loadConfigsIngestor;

plugins.connectToAllDatabases(true).then(function() {
    log.i('Db connections done');

    // Write Batcher is used by sdk metrics
    common.writeBatcher = new WriteBatcher(common.db);
    common.readBatcher = new Cacher(common.db);

    if (common.drillDb) {
        common.drillReadBatcher = new Cacher(common.drillDb, { configs_db: common.db });
    }

    /**
     * Set Max Sockets
     */
    http.globalAgent.maxSockets = countlyConfig.api.max_sockets || 1024;

    /**
     * Initialize Plugins
     */
    // plugins.init(); - should run new init ingestor

    /**
     * Trying to gracefully handle the batch state
     * @param code - error code or signal
     */
    async function storeBatchedData(code: number | string): Promise<void> {
        try {
            // await common.writeBatcher.flushAll();
            // await common.insertBatcher.flushAll();
            console.log('Successfully stored batch state');
        }
        catch (ex) {
            console.log('Could not store batch state', ex);
        }
        process.exit(typeof code === 'number' ? code : 1);
    }

    /**
     * Handle before exit for graceful close
     */
    process.on('beforeExit', (code: number) => {
        console.log('Received exit, trying to save batch state:', code);
        storeBatchedData(code);
    });

    /**
     * Handle exit events for graceful close
     */
    const signals: NodeJS.Signals[] = [
        'SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
        'SIGBUS', 'SIGFPE', 'SIGSEGV', 'SIGTERM'
    ];

    for (const sig of signals) {
        process.on(sig, async function() {
            storeBatchedData(sig);
            console.log('Got signal: ' + sig);
        });
    }

    /**
     * Uncaught Exception Handler
     */
    process.on('uncaughtException', (err: Error) => {
        console.log('Caught exception: %j', err, err.stack);
        if (log && log.e) {
            log.e('Logging caught exception');
        }
        console.trace();
        storeBatchedData(1);
    });

    /**
     * Unhandled Rejection Handler
     */
    process.on('unhandledRejection', (reason: unknown, p: Promise<unknown>) => {
        console.log('Unhandled rejection for %j with reason %j stack', p, reason, reason && typeof reason === 'object' && 'stack' in reason ? (reason as Error).stack : undefined);
        if (log && log.e) {
            log.e('Logging unhandled rejection');
        }
        console.trace();
    });

    console.log('Starting ingestor', process.pid);

    // Since process restarted mark running tasks as errored
    plugins.dispatch('/ingestor', { common: common });
    plugins.init({ 'skipDependencies': true, 'filename': 'ingestor' });

    console.log('Loading configs');

    plugins.loadConfigs(common.db, function() {
        console.log('Configs loaded. Opening server connection');
        console.log(JSON.stringify(common.config.ingestor || {}));

        const server = http.createServer((req: IngestorRequest, res: ServerResponse) => {
            const params: IngestorParams = {
                qstring: {},
                res: res,
                req: req
            };

            params.tt = Date.now().valueOf();

            if (req.method?.toLowerCase() === 'post') {
                const formidableOptions: FormidableOptions = {};
                if (countlyConfig.api.maxUploadFileSize) {
                    formidableOptions.maxFileSize = countlyConfig.api.maxUploadFileSize;
                }

                const form = new formidable.IncomingForm(formidableOptions);

                if (/crash_symbols\/(add_symbol|upload_symbol)/.test(req.url || '')) {
                    req.body = [] as Buffer[];
                    req.on('data', (data: Buffer) => {
                        (req.body as Buffer[]).push(data);
                    });
                }
                else {
                    req.body = '';
                    req.on('data', (data: Buffer) => {
                        (req.body as string) += data.toString();
                    });
                }

                let multiFormData = false;
                // Check if we have 'multipart/form-data'
                if (req.headers['content-type']?.startsWith('multipart/form-data')) {
                    multiFormData = true;
                }

                form.parse(req, (err: Error | null, fields: Record<string, unknown>, files: Record<string, FormidableFile>) => {
                    // Handle backwards compatibility with formidable v1
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
                        processRequest(params as any);
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
            // Attempt process GET request
            else if (req.method?.toLowerCase() === 'get') {
                processRequest(params as any);
            }
            else {
                common.returnMessage(params as any, 405, 'Method not allowed');
            }
        });

        server.listen(
            common.config?.ingestor?.port || 3010,
            common.config?.ingestor?.host || ''
        );
        server.timeout = common.config?.ingestor?.timeout || 120000;
    });
});

/**
 * On incoming request
 * 1) Get App data (Batcher)
 * 2) Get overall configs
 */

// Export types for use by other modules
export type { IngestorParams, IngestorRequest, FormidableFile };
