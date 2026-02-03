/**
 * TCP Example - demonstrates TCP server for Countly API
 * @module api/tcp_example
 */

import type { Socket } from 'net';

import net from 'net';
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const countlyConfig = require('./config');
const plugins = require('../plugins/pluginManager.js');
const logModule = require('./utils/log.js');
const common = require('./utils/common.js');
const { processRequest } = require('./utils/requestProcessor');

const log = logModule('core:tcp') as { i: (...args: unknown[]) => void; e: (...args: unknown[]) => void; d: (...args: unknown[]) => void; w: (...args: unknown[]) => void };

/**
 * TCP request data format
 */
interface TcpRequestData {
    /** API endpoint URL */
    url: string;
    /** Request body data */
    body?: Record<string, unknown>;
}

/**
 * Request parameters for TCP processing
 */
interface TcpParams {
    /** Request object */
    req: {
        url: string;
        body?: Record<string, unknown>;
        method: string;
    };
    /** API callback function */
    APICallback: (
        err: Error | null,
        responseData: string,
        headers: Record<string, string>,
        returnCode: number,
        paramsOb: unknown
    ) => void;
}

/**
 * Create DB connection
 */
plugins.dbConnection(countlyConfig).then(function(db: typeof common.db) {
    common.db = db;

    /**
     * Initialize Plugins
     */
    plugins.init();

    /**
     * Uncaught Exception Handler
     */
    process.on('uncaughtException', (err: Error) => {
        console.log('Caught exception: %j', err, err.stack);
        if (log && log.e) {
            log.e('Logging caught exception');
        }
        process.exit(1);
    });

    /**
     * Unhandled Rejection Handler
     */
    process.on('unhandledRejection', (reason: unknown, p: Promise<unknown>) => {
        console.log('Unhandled rejection for %j with reason %j stack', p, reason, reason && typeof reason === 'object' && 'stack' in reason ? (reason as Error).stack : undefined);
        if (log && log.e) {
            log.e('Logging unhandled rejection');
        }
    });

    /**
     * Let plugins know process started
     */
    plugins.dispatch("/worker", { common: common });

    /**
     * Preload initial configs
     */
    plugins.loadConfigs(common.db);

    /**
     * Create TCP server
     */
    net.createServer(function(socket: Socket) {

        /**
         * Common response function to sockets and logging received data
         * @param message - response string that was usually returned by API
         * @param headers - HTTP headers that would usually be returned by API
         * @param returnCode - HTTP response code that would usually be returned by API
         * @param paramsOb - params object for processed request
         */
        function respond(message: string, headers?: Record<string, string>, returnCode?: number, paramsOb?: unknown): void {
            console.log(message, headers, returnCode, paramsOb);
            if (socket.readyState === "open") {
                socket.write(message);
            }
        }

        // npm install JSONStream
        const JSONStream = require('JSONStream');

        // Parse JSON stream and call data on each separate JSON object
        socket.pipe(JSONStream.parse()).on('data', function(data: TcpRequestData | null) {
            if (data) {
                /**
                 * Accepting req data in format {"url":"endpoint", "body":"data"}
                 * Example: {"url":"/o/ping"}
                 * Example: {"url":"/i", "body":{"device_id":"test","app_key":"APP_KEY","begin_session":1,"metrics":{}}}
                 */
                // Creating request context
                const params: TcpParams = {
                    // Providing data in request object
                    'req': {
                        url: data.url,
                        body: data.body,
                        method: "tcp"
                    },
                    // Adding custom processing for API responses
                    'APICallback': function(err: Error | null, responseData: string, headers: Record<string, string>, returnCode: number, paramsOb: unknown) {
                        // Sending response to client
                        respond(responseData, headers, returnCode, paramsOb);
                    }
                };

                // Processing request
                processRequest(params as any);
            }
            else {
                respond('Data cannot be parsed');
            }
        }).on("error", function(err: Error) {
            console.log("TCP parse error", err);
        });

        socket.on("error", function(err: Error) {
            console.log("TCP connection error", err);
        });

        socket.on("close", function(hadError: boolean) {
            console.log("TCP connection closed with error", hadError);
        });
    }).listen(3005, "localhost");
});

// Export types for use by other modules
export type { TcpRequestData, TcpParams };
