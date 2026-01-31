/**
 * Module for handling possibly long running tasks
 * @module api/utils/taskmanager
 */
import crypto from 'crypto';
import { createRequire } from 'module';

// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

interface QueryData {
    appID?: string;
    event?: string;
    name?: string;
    queryName?: string;
    query?: unknown;
    period?: unknown;
    periodOffset?: number;
    bucket?: string;
    segmentation?: string;
    [key: string]: unknown;
}

interface LongTaskOptions {
    query_data: QueryData;
    db?: typeof common.db;
    id?: string;
    no_cache?: boolean;
    returned?: boolean;
    outputData: (err: Error | null, data: unknown) => void;
    threshold: number;
    query_function?: (data: QueryData, callback: (err: Error | null, result: unknown) => void) => void;
    current_data?: unknown;
    errored?: boolean;
    errormsg?: Error | string;
    duration?: number;
}

interface CacheDocument {
    _id: string;
    status: string;
    data?: unknown;
    lu?: Date;
    duration?: number;
}

const common = require('./common.js');
const fetch = require('../parts/data/fetch.js');
const plugins = require('../../plugins/pluginManager.ts');

const collection = 'drill_data_cache';
const log = require('./log.js')('core:calculatedDataManager');

/** @lends module:api/utils/taskmanager */
const calculatedDataManager: {
    longtask: (options: LongTaskOptions) => Promise<void>;
    saveResult: (options: LongTaskOptions, data: unknown) => void;
    getId: (data: QueryData) => string;
} = {
    /**
     * Looks if there is any cached data for given query, if there is not marks it as calculating. returns result if can be calculated in time
     * @param options - options object
     */
    longtask: async function(options: LongTaskOptions): Promise<void> {
        options.id = calculatedDataManager.getId(options.query_data);
        options.db = options.db || common.db;
        let timeout: ReturnType<typeof setTimeout> | undefined;
        let keep = Number.parseInt(plugins.getConfig('drill').drill_snapshots_cache_time as string, 10) || 60 * 60 * 24;
        keep = keep * 1000;
        if (options.no_cache) {
            keep = 0;
        }

        /**
         * Return message in case it takes too long
         * @param options5 - options
         */
        function notifyClient(options5: LongTaskOptions): void {
            if (!options5.returned) {
                options5.returned = true;
                options5.outputData(null, {'_id': options5.id, 'running': true, 'data': options5.current_data || {}});
            }
        }

        /**
         * Called if there is indication that calculations are in progress
         * @param options6 - options
         * @param timeoutObj - timeout object for returning data
         * @param retry - number of retries left
         */
        async function waitForData(options6: LongTaskOptions, timeoutObj: ReturnType<typeof setTimeout>, retry: number): Promise<void> {
            retry = retry - 1;
            if (retry <= 0) {
                return;
            }
            else {
                try {
                    const data = await common.db.collection(collection).findOne({_id: options6.id}) as CacheDocument | null;
                    if (data && data.data) {
                        clearTimeout(timeoutObj);
                        options6.outputData(null, {'_id': options6.id, 'lu': data.lu, 'data': data.data || {}});
                        return;
                    }
                    else {
                        setTimeout(function() {
                            waitForData(options6, timeoutObj, retry);
                        }, 2000);
                    }
                }
                catch (e) {
                    log.e('Error while getting calculated data', e);
                }
            }
        }

        /**
         * Switching to long task
         * @param my_options - options
         */
        async function switchToLongTask(my_options: LongTaskOptions): Promise<void> {
            timeout = setTimeout(function() {
                notifyClient(my_options);
            }, my_options.threshold * 1000);
            try {
                await common.db.collection(collection).insertOne({_id: my_options.id, status: 'calculating', 'lu': new Date()});
            }
            catch (e) {
                // As could not insert, it might be calculating already
                waitForData(my_options, timeout, 10);
                return;
            }
            const start = Date.now().valueOf();
            const my_function = my_options.query_function || fetch.fetchFromGranularData;
            my_function(my_options.query_data, function(err: Error | null, res: unknown) {
                if (err) {
                    my_options.errored = true;
                    my_options.errormsg = err;
                }
                const end = Date.now().valueOf();
                my_options.duration = end - start;
                calculatedDataManager.saveResult(my_options, res);
                clearTimeout(timeout);
                if (!my_options.returned) {
                    my_options.outputData(err, {'_id': my_options.id, 'data': res, 'lu': new Date()});
                }
            });
        }

        const data = await common.db.collection(collection).findOne({_id: options.id}) as CacheDocument | null;

        if (data) {
            options.current_data = data.data;
            if (data.status === 'done') {
                // Check if it is not too old
                let recalculate = false;
                /* Calculate again if:
                   no_cache
                   takes less than 5 seconds and data is 10 seconds old.
                */
                if (options.no_cache || ((!data.duration || data.duration < 5000) && data.lu && (Date.now() - data.lu.getTime()) > 10000)) {
                    recalculate = true;
                }
                if (!recalculate && data.lu && (Date.now() - data.lu.getTime()) < keep && data.data) {
                    options.outputData(null, {'data': data.data, 'lu': data.lu, '_id': options.id});
                    clearTimeout(timeout);
                    return;
                }
                else {
                    common.db.collection(collection).deleteOne({_id: options.id}, function(ee: Error | null) {
                        if (ee) {
                            log.e('Error while deleting calculated data', ee);
                        }
                        switchToLongTask(options);
                    });
                }
            }
            else if (data.status === 'calculating') {
                if (data.lu && (Date.now() - new Date(data.lu).getTime()) < 1000 * 60 * 60) {
                    // Return current data if there is any and let it know it is calculating
                    if (data.data) {
                        clearTimeout(timeout);
                        options.outputData(null, {'_id': options.id, 'running': true, data: data.data || {}});
                        return;
                    }
                    else {
                        // Do retry each few seconds to check if result is created
                        waitForData(options, timeout!, 10);
                    }
                }
                else {
                    common.db.collection(collection).deleteOne({_id: options.id}, function(ee: Error | null) {
                        if (ee) {
                            log.e('Error while deleting calculated data', ee);
                        }
                        switchToLongTask(options);
                    });
                }
            }
        }
        else {
            switchToLongTask(options);
            return;
        }
    },

    saveResult: function(options: LongTaskOptions, data: unknown): void {
        options.db!.collection(collection).updateOne({_id: options.id}, {$set: {status: 'done', data: data, lu: new Date(), duration: options.duration}}, {upsert: true}, function(err: Error | null) {
            if (err) {
                log.e('Error while saving calculated data', err);
            }
        });
    },

    getId: function(data: QueryData): string {
        // Period should be given as 2 date
        const keys = ['appID', 'event', 'name', 'queryName', 'query', 'period', 'periodOffset', 'bucket', 'segmentation'] as const;
        let dataString = '';
        for (const key of keys) {
            if (data[key]) {
                dataString += JSON.stringify(data[key]);
            }
        }
        return crypto.createHash('sha1').update(dataString).digest('hex');
    }
};

export default calculatedDataManager;
export { calculatedDataManager };
