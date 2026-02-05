/**
 * Change Stream Reader module
 * @module api/parts/data/changeStreamReader
 */

import type { Document, ChangeStream, Timestamp as MongoTimestamp, ObjectId } from 'mongodb';
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const common = require('../../utils/common.js');
const logModule = require('../../utils/log.js');
const mongodb = require('mongodb');
const Timestamp = mongodb.Timestamp as typeof MongoTimestamp;

const log = logModule('changeStreamReader') as {
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
        find: (query: Record<string, unknown>) => {
            sort: (sort: Record<string, number>) => {
                toArray: () => Promise<T[]>;
                hasNext: () => Promise<boolean>;
                next: () => Promise<T | null>;
                close: () => Promise<void>;
            };
        };
        watch: (pipeline: unknown[], options: Record<string, unknown>) => Promise<ChangeStream>;
        aggregate: (pipeline: unknown[]) => {
            hasNext: () => Promise<boolean>;
            next: () => Promise<T | null>;
        };
    };
    watch: (pipeline: unknown[], options: Record<string, unknown>) => Promise<ChangeStream>;
}

/**
 * Token info interface
 */
interface TokenInfo {
    token: unknown;
    cd?: Date;
    _id?: string | ObjectId | null;
}

/**
 * Fallback options interface
 */
interface FallbackOptions {
    pipeline?: unknown[];
    match?: Record<string, unknown>;
    timefield?: string;
    interval?: number;
}

/**
 * Change stream options interface
 */
interface ChangeStreamOptions {
    pipeline?: unknown[];
    name?: string;
    collection?: string;
    options?: Record<string, unknown>;
    onClose?: (callback: () => void) => void;
    interval?: number;
    fallback?: FallbackOptions;
}

/**
 * Data callback type
 */
type DataCallback = (token: TokenInfo, data: unknown) => void;

/**
 * Class to use change streams to read from mongodb.
 */
class changeStreamReader {
    private db: Database;
    private pipeline: unknown[];
    private lastToken: TokenInfo | null;
    private name: string;
    private collection: string;
    private options: Record<string, unknown>;
    private onClose?: (callback: () => void) => void;
    private firstDocAfterReset: unknown;
    private startupFailure: unknown;
    private onData: DataCallback;
    private interval: number;
    private intervalRunner: ReturnType<typeof setInterval> | null;
    private keep_closed: boolean;
    private waitingForAcknowledgement: number | false;
    private fallback?: FallbackOptions;
    private stream?: ChangeStream;
    private failedToken?: TokenInfo;
    private restartStream?: boolean;

    /**
     * Constructor
     * @param db - Database object
     * @param options - Options object
     * @param onData - Function to call when getting new data from stream
     */
    constructor(db: Database, options: ChangeStreamOptions, onData: DataCallback) {
        this.db = db;
        this.pipeline = options.pipeline || [];
        this.lastToken = null;
        this.name = options.name || '';
        this.collection = options.collection || 'drill_events';
        this.options = options.options || {};
        this.onClose = options.onClose;
        this.firstDocAfterReset = null;
        this.startupFailure = null;
        this.onData = onData;
        this.interval = options.interval || 10000;
        this.intervalRunner = null;
        this.keep_closed = false;
        this.waitingForAcknowledgement = false;
        this.fallback = options.fallback;

        if (this.fallback && !this.fallback.interval) {
            this.fallback.interval = 1000;
        }

        this.setUp(onData);

        if (this.intervalRunner) {
            clearInterval(this.intervalRunner);
        }
        this.intervalRunner = setInterval(this.checkState.bind(this), this.interval);
    }

    /**
     * Check if stream is closed and restart if needed
     */
    checkState(): void {
        if ((!this.stream || this.stream.closed) && !this.keep_closed) {
            log.i(`[${this.name}] Stream is closed. Setting up again`);
            this.setUp(this.onData);
        }
        else if (this.waitingForAcknowledgement && Date.now() - this.waitingForAcknowledgement > 60000) {
            const waitTime = Date.now() - this.waitingForAcknowledgement;
            log.w(`[${this.name}] Waiting for acknowledgement for ${waitTime}ms (>60s). Closing stream and restarting`);
            this.keep_closed = false;
            if (this.stream && !this.stream.closed) {
                this.stream.close();
            }
        }
    }

    /**
     * Processes range of dates
     * @param cd - start time
     */
    async processNextDateRange(cd: Date): Promise<void> {
        if (this.fallback) {
            let cd2 = cd.valueOf() + 60000;
            const now = Date.now().valueOf();
            cd2 = Math.min(cd2, now);

            const cd2Date = new Date(cd2);
            const pipeline = JSON.parse(JSON.stringify(this.fallback.pipeline)) || [];
            const match: Record<string, unknown> = this.fallback.match || {};

            if (this.fallback.timefield) {
                match[this.fallback.timefield] = { $gte: new Date(cd), $lt: cd2Date };
            }
            else {
                match.cd = { $gte: new Date(cd), $lt: cd2Date };
            }
            pipeline.unshift({ '$match': match });
            const cursor = this.db.collection(this.collection).aggregate(pipeline);

            while (await cursor.hasNext()) {
                const doc = await cursor.next() as { cd?: Date; _id?: string | ObjectId };
                this.onData({ 'token': 'timed', 'cd': doc?.cd, '_id': doc?._id }, doc);
            }
            setTimeout(() => {
                this.processNextDateRange(cd2Date);
            }, this.fallback.interval || 10000);
        }
    }

    /**
     * Process bad range (when token can't continue)
     * @param options - Options object
     * @param tokenInfo - Token info object
     */
    async processBadRange(options: { name: string; cd1?: Date; cd2?: Date }, tokenInfo: TokenInfo): Promise<void> {
        log.i(`[${this.name}] Processing bad range for timespan: ${options.cd1} to ${options.cd2}`);
        log.d(`[${this.name}] Query filter: ${JSON.stringify({ cd: { $gte: options.cd1, $lt: options.cd2 } })}`);

        type DocType = { _id?: string | ObjectId; cd?: Date } | null;
        let gotTokenDoc = false;
        let doc: DocType = null;
        let cursor: { hasNext: () => Promise<boolean>; next: () => Promise<unknown>; close: () => Promise<void> } | undefined;
        try {
            cursor = this.db.collection(this.collection).find({ cd: { $gte: new Date(options.cd1!), $lt: new Date(options.cd2!) } }).sort({ cd: 1 }) as unknown as typeof cursor;

            while (await cursor!.hasNext() && !gotTokenDoc) {
                doc = await cursor!.next() as DocType;
                if (JSON.stringify(doc?._id) === JSON.stringify(tokenInfo._id) || (doc?.cd && tokenInfo.cd && doc.cd > tokenInfo.cd)) {
                    gotTokenDoc = true;
                }
                log.d(`[${this.name}] Skipping document: ${doc?._id} at ${doc?.cd}`);
            }

            if (doc && doc.cd && tokenInfo.cd && doc.cd > tokenInfo.cd) {
                tokenInfo.cd = doc.cd;
                tokenInfo._id = doc._id;
                log.d(`[${this.name}] Processing recovered document: ${doc._id} at ${doc.cd}`);
                this.onData(tokenInfo, doc);
            }

            while (await cursor!.hasNext()) {
                doc = await cursor!.next() as DocType;
                log.d(`[${this.name}] Processing document: ${doc?._id} at ${doc?.cd}`);
                tokenInfo.cd = doc?.cd;
                tokenInfo._id = doc?._id;
                this.onData(tokenInfo, doc);
            }

            log.i(`[${this.name}] Bad range processing completed successfully`);
        }
        catch (err) {
            log.e(`[${this.name}] Error during bad range processing`, err);
            throw err;
        }
        finally {
            if (cursor) {
                try {
                    await cursor.close();
                }
                catch (err) {
                    log.w(`[${this.name}] Error closing cursor during bad range processing`, err);
                }
            }
        }
    }

    /**
     * Sets up stream to read data from mongodb
     * @param onData - function to call on new data
     */
    async setUp(onData: DataCallback): Promise<void> {
        let token: TokenInfo | undefined;
        try {
            if (this.stream && !this.stream.closed) {
                log.d(`[${this.name}] Stream is already open, skipping setup`);
                return;
            }
            const options: Record<string, unknown> = JSON.parse(JSON.stringify(this.options || {}));
            let tokenFailed = false;
            const res = await common.db.collection('plugins').findOne({ '_id': '_changeStreams' }, { projection: { [this.name]: 1 } });
            if (res && res[this.name] && res[this.name].token) {
                token = res[this.name] as TokenInfo;
                options.startAfter = token.token;
            }
            if (this.failedToken && JSON.stringify(this.failedToken.token) === JSON.stringify(token?.token)) {
                log.w(`[${this.name}] Not using failed token, switching to time-based resume`);
                tokenFailed = true;
                delete options.startAfter;
                const startTime = Date.now().valueOf() / 1000 - 60;
                if (startTime) {
                    options.startAtOperationTime = new Timestamp({ t: startTime, i: 1 });
                }
            }
            log.d(`[${this.name}] Stream options: ${JSON.stringify(options)}`);
            if (this.collection) {
                this.stream = await this.db.collection(this.collection).watch(this.pipeline, options);
            }
            else {
                this.stream = await this.db.watch(this.pipeline, options);
            }
            const self = this;

            if (tokenFailed && token) {
                // fetch data while cd is less than failed token
                log.i(`[${this.name}] Fetching data while timestamp is less than or equal to failed token timestamp`);
                let doc: { cd?: Date; __id?: string | ObjectId; _id?: string | ObjectId } | null;
                do {
                    doc = await this.stream.next() as typeof doc;
                    log.d(`[${this.name}] Processing document during token recovery: ${doc?._id} at ${doc?.cd}`);
                }
                while (doc && doc.cd && token.cd && doc.cd <= token.cd);
                this.keep_closed = true;
                this.stream.close();
                const next_token: TokenInfo = { 'token': (this.stream as unknown as { resumeToken: unknown }).resumeToken, _id: doc?.__id, cd: doc?.cd };
                try {
                    await this.processBadRange({ name: this.name, cd1: token.cd, cd2: next_token.cd }, this.failedToken!);
                    this.onData(next_token, doc);
                    this.waitingForAcknowledgement = Date.now();
                    this.restartStream = true;
                    this.failedToken = undefined;
                }
                catch (err) {
                    log.e('Error on processing bad range', err);
                    if (this.onClose) {
                        this.onClose(function() {
                            self.keep_closed = false;
                        });
                    }
                }
            }
            else {
                this.stream.on('change', (change: { __id?: string | ObjectId; fullDocument?: { _id?: string | ObjectId; cd?: Date }; cd?: Date }) => {
                    const my_token: TokenInfo = { token: (self.stream as unknown as { resumeToken: unknown }).resumeToken, _id: change.__id || change.fullDocument?._id };
                    const cd = change.cd || change.fullDocument?.cd;
                    if (cd) {
                        my_token.cd = cd;
                        onData(my_token, change);
                    }
                    else {
                        onData(my_token, change);
                    }
                });

                this.stream.on('error', async(err: { code?: number }) => {
                    if (err.code === 286 || err.code === 50811 || err.code === 9 || err.code === 14 || err.code === 280) { // Token is not valid
                        log.e('Set Failed token', token);
                        self.failedToken = token;
                    }
                    else if (err.code === 40573) { // change stream is not supported
                        log.w(`[${self.name}] Change streams not supported by database, switching to polling mode`);
                        self.keep_closed = true;
                        const newCD = Date.now();
                        if (token && token.cd) {
                            await self.processBadRange({ name: self.name, cd1: token.cd, cd2: new Date(newCD) }, token);
                        }

                        self.processNextDateRange(new Date(newCD));
                    }
                    else {
                        log.e('Error on change stream', err);
                    }
                });
                // Turns out it is closing on exhausted. So we have to let aggregator know to flush aggregated data.
                this.stream.on('close', () => {
                    // Trigger flushing data
                    if (self.onClose) {
                        self.onClose(function() {});
                    }
                    log.e('Stream closed.');
                });
            }
        }
        catch (err) {
            const error = err as { code?: number };
            if (error.code === 286 || error.code === 50811 || error.code === 9) { // failed because of bad token
                log.w(`[${this.name}] Invalid token detected, marking as failed`, { token, error: (err as Error).message });
                this.failedToken = token;
            }
            // Failed because of db does not support change streams. Run in "query mode";
            else if (error.code === 40573) { // change stream is not supported
                log.w(`[${this.name}] Change streams not supported by database, switching to polling mode`);
                this.keep_closed = true;
                const newCD = Date.now();
                if (token && token.cd) {
                    await this.processBadRange({ name: this.name, cd1: token.cd, cd2: new Date(newCD) }, token);
                }

                this.processNextDateRange(new Date(newCD));
                // Call process bad range if there is any info about last token.
                // Switch to query mode
            }
            else {
                log.e(`[${this.name}] Unexpected error during change stream setup`, err);
            }
        }
    }

    /**
     * Acknowledges token as recorded
     * @param token - token info
     */
    async acknowledgeToken(token: TokenInfo): Promise<void> {
        this.lastToken = token;
        // Update last processed token to database
        try {
            await common.db.collection('plugins').updateOne({ '_id': '_changeStreams' }, { $set: { [this.name]: token } }, { 'upsert': true });
            if (this.restartStream) {
                this.waitingForAcknowledgement = false;
                this.restartStream = false;
                this.keep_closed = false;
                if (this.stream && !this.stream.closed) {
                    this.stream.close();
                }
            }
        }
        catch (err) {
            log.e('Error on acknowledging token', JSON.stringify(err));
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
        this.keep_closed = true;
        if (this.stream && !this.stream.closed) {
            this.stream.close();
        }
    }

}

export { changeStreamReader };
export type { ChangeStreamOptions, TokenInfo, DataCallback, FallbackOptions };
