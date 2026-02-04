/**
 * Data Batch Reader module
 * @module api/parts/data/dataBatchReader
 */

import type { Document, ObjectId } from 'mongodb';
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const common = require('../../utils/common.js');
const logModule = require('../../utils/log.js');
const plugins = require('../../../plugins/pluginManager.ts');
const { fetchDataForAggregator } = require('../queries/aggregator.js');

const log = logModule('dataBatchReader') as {
    d: (...args: unknown[]) => void;
    e: (...args: unknown[]) => void;
    i: (...args: unknown[]) => void;
    w: (...args: unknown[]) => void;
};

/**
 * Database interface
 */
interface Database {
    collection: <T extends Document = Document>(name: string) => {
        aggregate: (pipeline: unknown[]) => {
            hasNext: () => Promise<boolean>;
            next: () => Promise<T | null>;
            toArray: () => Promise<T[]>;
        };
    };
}

/**
 * Token info interface
 */
interface TokenInfo {
    token: string;
    cd: Date;
    _id: string | ObjectId | null;
}

/**
 * Data batch reader options interface
 */
interface DataBatchReaderOptions {
    pipeline?: unknown[];
    match?: Record<string, unknown>;
    timefield?: string;
    name?: string;
    collection?: string;
    options?: Record<string, unknown>;
    interval?: number;
    reviveInterval?: number;
}

/**
 * Data callback type
 */
type DataCallback = (token: TokenInfo, data: unknown) => Promise<void>;

/**
 * Class to read/aggregate data in batches from mongodb and pass for processing.
 */
class DataBatchReader {
    private db: Database;
    private pipeline: unknown[];
    private match: Record<string, unknown>;
    private timefield: string;
    private lastToken: TokenInfo | null;
    private name: string;
    private collection: string;
    private options: Record<string, unknown>;
    private onData: DataCallback;
    private interval: number;
    private reviveInterval: number;
    private localId: string;
    private intervalRunner: ReturnType<typeof setInterval> | null;
    private processTimeout: ReturnType<typeof setTimeout> | null;

    /**
     * Constructor
     * @param db - Database object
     * @param options - Options object
     * @param onData - Function to call when getting new data from stream
     */
    constructor(db: Database, options: DataBatchReaderOptions, onData: DataCallback) {
        log.d('Creating dataBatchReader', JSON.stringify(options));
        this.db = db;
        this.pipeline = options.pipeline || [];
        this.match = options.match || {};
        this.timefield = options.timefield || 'cd'; // default time field is cd
        this.lastToken = null;
        this.name = options.name || '';
        this.collection = options.collection || 'drill_events';
        this.options = options.options || {};
        this.onData = onData;
        this.interval = options.interval || 10000;
        this.processTimeout = null;

        if (plugins.getConfig('aggregator') && plugins.getConfig('aggregator').interval) {
            log.w('Using aggregator config interval for dataBatchReader', plugins.getConfig('aggregator').interval);
            this.interval = plugins.getConfig('aggregator').interval;
        }
        else {
            log.d('Using default or provided interval for dataBatchReader', this.interval);
        }

        this.reviveInterval = options.reviveInterval || 60000; // 1 minute
        this.setUp();

        this.localId = this.name + Date.now().valueOf();

        this.intervalRunner = setInterval(this.checkState.bind(this), this.reviveInterval);
    }

    /**
     * Check if stream is closed and restart if needed
     */
    async checkState(): Promise<void> {
        log.d('Checking state for batcher to revive if dead');
        // Check last token in database. If it is older than 60 seconds. Set up again
        try {
            const token = await common.db.collection('plugins').findOne({ '_id': '_changeStreams' }, { projection: { [this.name]: 1 } });
            if (token && token[this.name] && token[this.name].lu) {
                const lu = token[this.name].lu.valueOf();
                const now = Date.now().valueOf();
                if (now - lu > this.reviveInterval) {
                    log.d('Stream is closed. Restarting it');
                    this.setUp();
                }
            }
            else {
                log.d('Processor does not exists. Set it up again.');
                this.setUp();
            }
        }
        catch (err) {
            log.e('Error checking state for batcher', err);
        }
    }

    /**
     * Processes range of dates
     */
    async processNextDateRange(): Promise<void> {
        const lastToken = await common.db.collection('plugins').findOne({ '_id': '_changeStreams' }, { projection: { [this.name]: 1 } });
        let cd = lastToken && lastToken[this.name] ? lastToken[this.name].cd : Date.now();
        let end_date = cd.valueOf() + this.interval;
        let now = Date.now().valueOf();
        while (end_date < now) {
            const pipeline = JSON.parse(JSON.stringify(this.pipeline)) || [];
            const match = this.match || {};

            if (this.timefield) {
                match[this.timefield] = { $gte: new Date(cd), $lt: new Date(end_date) };
            }
            else {
                match.cd = { $gte: new Date(cd), $lt: new Date(end_date) };
            }
            pipeline.unshift({ '$match': match });
            // Reads from mongodb or clickhouse(if code is defined);
            const data = await fetchDataForAggregator({ pipeline: pipeline, name: this.name, cd1: cd, cd2: end_date }) as unknown[];

            try {
                if (data.length > 0) {
                    await this.onData({ 'token': 'timed', 'cd': new Date(end_date), '_id': null }, data);
                }
                await this.acknowledgeToken({ 'token': 'timed', 'cd': new Date(end_date), '_id': null });
                // acknowledge
            }
            catch (err) {
                log.e(this.name + ': Error processing data for - ' + end_date + ' ' + JSON.stringify(err));
                return; // exiting loop.
            }
            cd = end_date;
            end_date = end_date + this.interval;
            now = Date.now().valueOf();
        }
        this.processTimeout = setTimeout(() => {
            this.processNextDateRange();
        }, this.interval);

    }


    /**
     * Sets up stream to read data from mongodb
     */
    async setUp(): Promise<void> {
        const res = await common.db.collection('plugins').findOne({ '_id': '_changeStreams' }, { projection: { [this.name]: 1 } });
        if (!res || !res[this.name]) {
            // none exists. create token with current time
            log.w('None exists. Creating new token for ' + this.name);
            await common.db.collection('plugins').updateOne({ '_id': '_changeStreams' }, { $set: { [this.name]: { 'token': 'timed', 'cd': Date.now(), '_id': null, localId: this.localId } } }, { 'upsert': true });
        }
        else {
            log.w('some exits. Checking if it is stale for ' + this.name);
            // we have some document. Check last cd and start process on localId if it is stale
            let lu = 0;
            if (res[this.name].lu) {
                lu = res[this.name].lu.valueOf();
            }
            const now = Date.now().valueOf();
            if (now - lu > this.reviveInterval) {
                log.d('It is stale. Setting up again for ' + this.name);
                // try setting this as correct local id
                const query: Record<string, unknown> = { '_id': '_changeStreams' };
                query[this.name + '.localId'] = res[this.name].localId;

                const set: Record<string, unknown> = {};
                set[this.name + '.localId'] = this.localId;
                set[this.name + '.lu'] = Date.now();

                const newDoc = await common.db.collection('plugins').updateOne(query, { $set: set }, { 'upsert': false });
                if (newDoc && newDoc.modifiedCount > 0) {
                    // all good
                    log.d(this.name + ': set up with localId - ' + this.localId);
                }
                else {
                    log.w(this.name + ': Could not set up with localId - ' + this.localId);
                    // Do not continue. Some other process might have started this
                    return;
                }
            }
            else {
                log.d('Seems like there is one running. do not do anything yet.');
                // do not start yet. Wait for next interval
                return;
            }
        }
        this.processNextDateRange();

    }

    /**
     * Acknowledges token as recorded
     * @param token - token info
     */
    async acknowledgeToken(token: TokenInfo): Promise<void> {
        this.lastToken = token;
        // Update last processed token to database
        const query: Record<string, unknown> = { '_id': '_changeStreams' };
        query[this.name + '.localId'] = this.localId;
        const set: Record<string, unknown> = {};
        set[this.name + '.lu'] = Date.now();
        set[this.name + '.cd'] = token.cd;
        const rezz = await common.db.collection('plugins').updateOne(query, { $set: set }, { 'upsert': false });
        if (rezz && rezz.modifiedCount > 0) {
            // all good
        }
        else {
            // could not match. Looks like some other process is aggregating. throw error
            throw new Error('Could not acknowledge token. Looks like some other process is aggregating');
        }
    }

    /**
     * Closes stream permanently
     */
    close(): void {
        log.i(`[${this.name}] Closing change stream reader permanently`);
        if (this.intervalRunner) {
            clearInterval(this.intervalRunner);
            this.intervalRunner = null;
        }
        if (this.processTimeout) {
            clearTimeout(this.processTimeout);
            this.processTimeout = null;
        }
    }

}

export { DataBatchReader };
export type { DataBatchReaderOptions, TokenInfo, DataCallback };
