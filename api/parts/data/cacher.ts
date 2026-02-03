/**
 * Cacher module - read data and keep cached in memory
 * @module api/parts/data/cacher
 */

import type { Document } from 'mongodb';
import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const plugins = require('../../../plugins/pluginManager.ts');

/**
 * Database interface
 */
interface Database {
    collection: <T extends Document = Document>(name: string) => {
        find: (query: Record<string, unknown>, projection?: Record<string, unknown>) => {
            toArray: () => Promise<T[]>;
        };
        findOne: (query: Record<string, unknown>, projection?: Record<string, unknown>) => Promise<T | null>;
    };
}

/**
 * Cacher options interface
 */
interface CacherOptions {
    configs_db?: Database;
    ttl?: number;
    period?: number;
}

/**
 * Cache entry interface
 */
interface CacheEntry {
    query: Record<string, unknown>;
    projection?: Record<string, unknown>;
    data?: unknown;
    promise?: Promise<unknown>;
    last_used: number;
    last_updated: number;
    multi: boolean;
}

/**
 * Projection result interface
 */
interface ProjectionResult {
    keys: string[];
    have_projection: boolean;
}

/**
 * Use it to read data and keep cached in memory in transformed state.
 */
class Cacher {
    private db: Database;
    private data: Record<string, Record<string, CacheEntry>>;
    private promises: Record<string, Promise<unknown>>;
    private options: CacherOptions;
    private transformationFunctions: Record<string, (data: unknown) => unknown>;
    private period: number;
    private ttl: number;
    private process: boolean;

    /**
     * Create batcher instance
     * @param db - database object
     * @param options - options object
     */
    constructor(db: Database, options?: CacherOptions) {
        this.db = db;
        this.data = {};
        this.promises = {};
        this.options = options || {};
        this.period = 60000;
        this.ttl = 600000;
        this.process = true;

        this.transformationFunctions = {};
        const configs_db = (this.options.configs_db || this.db);
        plugins.loadConfigs(configs_db, () => {
            this.loadConfig();
            this.schedule();
        });
    }

    /**
     * Reloads server configs
     */
    loadConfig(): void {
        const config = plugins.getConfig('api');
        this.period = config.batch_read_period * 1000;
        this.ttl = config.batch_read_ttl * 1000;
        this.process = config.batch_processing;

        if (this.options && this.options.ttl) {
            this.ttl = this.options.ttl * 1000;
            this.process = true;
        }
        if (this.options && this.options.period) {
            this.period = this.options.period * 1000;
            this.process = true;
        }
    }

    /**
     * Check all cache
     */
    checkAll(): void {
        for (const collection in this.data) {
            if (Object.keys(this.data[collection]).length) {
                for (const id in this.data[collection]) {
                    if (this.data[collection][id].last_used < Date.now() - this.ttl) {
                        delete this.data[collection][id];
                    }
                }
            }
        }
        this.schedule();
    }

    /**
     * Schedule next flush
     */
    schedule(): void {
        setTimeout(() => {
            this.loadConfig();
            this.checkAll();
        }, this.period);
    }

    /**
     * Get data from database
     * @param collection - name of the collection for which to write data
     * @param id - id of cache
     * @param query - query for the document
     * @param projection - which fields to return
     * @param transformation - transformation function name
     * @param multi - true if multiple documents
     * @returns promise
     */
    getData = async (
        collection: string,
        id: string,
        query: Record<string, unknown>,
        projection: Record<string, unknown> | undefined,
        transformation: string | undefined,
        multi: boolean
    ): Promise<unknown> => {
        let res: unknown;
        if (multi) {
            try {
                res = await this.db.collection(collection).find(query, projection).toArray();
                if (transformation && this.transformationFunctions[transformation]) {
                    res = this.transformationFunctions[transformation](res);
                }
                this.cache(collection, id, query, projection, res, true);
                return res;
            }
            catch (err) {
                if (this.data && this.data[collection] && this.data[collection][id] && this.data[collection][id].promise) {
                    this.data[collection][id].promise = undefined;
                }
                throw err;
            }
        }
        else {
            try {
                res = await this.db.collection(collection).findOne(query, projection);
                res = res || {};
                if (transformation && this.transformationFunctions[transformation]) {
                    res = this.transformationFunctions[transformation](res);
                }
                this.cache(collection, id, query, projection, res, false);
                return res;
            }
            catch (err) {
                if (this.data && this.data[collection] && this.data[collection][id] && this.data[collection][id].promise) {
                    this.data[collection][id].promise = undefined;
                }
                throw err;
            }
        }
    };

    /**
     * Get data from cache or from db and cache it
     * @param collection - name of the collection where to update data
     * @param query - query for the document
     * @param projection - which fields to return
     * @param transformation - transformation function name
     * @param refetch - true if need to refetch
     * @param multi - true if multiple documents
     * @returns promise
     */
    get(
        collection: string,
        query: Record<string, unknown>,
        projection: Record<string, unknown> | undefined,
        transformation: string | undefined,
        refetch: boolean | undefined,
        multi: boolean
    ): Promise<unknown> {
        let id = JSON.stringify(query) + '_' + multi;
        if (transformation) {
            id += '_' + JSON.stringify(transformation);
        }
        if (!this.data[collection]) {
            this.data[collection] = {};
        }
        let good_projection = true;
        const keysSaved = this.keysFromProjectionObject(this.data[collection][id] && this.data[collection][id].projection);
        const keysNew = this.keysFromProjectionObject(projection);

        if (this.data[collection][id] && (keysSaved.have_projection || keysNew.have_projection)) {
            if (keysSaved.have_projection) {
                for (let p = 0; p < keysNew.keys.length; p++) {
                    if (keysSaved.keys.indexOf(keysNew.keys[p]) === -1) {
                        good_projection = false;
                        keysSaved.keys.push(keysNew.keys[p]);
                    }
                }
            }
            if (!good_projection) {
                projection = {};
                for (let p = 0; p < keysSaved.keys.length; p++) {
                    projection[keysSaved.keys[p]] = 1;
                }
            }
        }

        if (refetch || !this.process || !good_projection || !this.data[collection][id] || (this.data[collection][id].last_updated < Date.now() - this.period)) {
            if (this.process) {
                this.data[collection][id] = {
                    query: query,
                    promise: this.getData(collection, id, query, projection, transformation, multi),
                    projection: projection,
                    last_used: Date.now(),
                    last_updated: Date.now(),
                    multi: multi
                };
                return this.data[collection][id].promise!;
            }
            else {
                return this.getData(collection, id, query, projection, transformation, multi);
            }
        }
        // we already have a read for this
        else if (this.data[collection][id] && this.data[collection][id].promise) {
            return this.data[collection][id].promise!;
        }
        else {
            this.data[collection][id].last_used = Date.now();
            return new Promise((resolve) => {
                resolve(this.data[collection][id].data);
            });
        }

    }

    /**
     * Get single document from cache or from db and cache it
     * @param collection - name of the collection where to update data
     * @param query - query for the document
     * @param options - options object
     * @param callback - optional to get result, or else will return promise
     * @returns if callback not passed, returns promise
     */
    getOne(
        collection: string,
        query: Record<string, unknown>,
        options?: {
            projection?: Record<string, unknown>;
            transformation?: string;
            refetch?: boolean;
        } | ((err: Error | null, data: unknown) => void),
        callback?: (err: Error | null, data: unknown) => void
    ): Promise<unknown> | void {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (!options) {
            options = {};
        }
        return promiseOrCallback(this.get(collection, query, options.projection, options.transformation, options.refetch, false), callback);
    }


    /**
     * Get multiple documents from cache or from db and cache it
     * @param collection - name of the collection where to update data
     * @param query - query for the documents
     * @param options - options object
     * @param callback - optional to get result, or else will return promise
     * @returns if callback not passed, returns promise
     */
    getMany(
        collection: string,
        query: Record<string, unknown>,
        options?: {
            projection?: Record<string, unknown>;
            transformation?: string;
            refetch?: boolean;
        } | ((err: Error | null, data: unknown) => void),
        callback?: (err: Error | null, data: unknown) => void
    ): Promise<unknown> | void {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        if (!options) {
            options = {};
        }
        return promiseOrCallback(this.get(collection, query, options.projection, options.transformation, options.refetch, true), callback);
    }

    /**
     * Update cache entry
     * @param collection - collection name
     * @param query - query to match data
     * @param update - data object to update
     */
    updateCacheOne(collection: string, query: Record<string, unknown>, update: Record<string, unknown>): void {
        const id = JSON.stringify(query) + '_' + false;
        if (this.data && this.data[collection] && this.data[collection][id] && this.data[collection][id].data) {
            for (const key in update) {
                (this.data as Record<string, unknown>)[key] = update[key];
            }
        }
    }

    /**
     * Gets list of keys from projection object which are included
     * @param projection - which fields to return
     * @returns {keys - list of keys, have_projection - true if projection not empty}
     */
    keysFromProjectionObject(projection?: Record<string, unknown>): ProjectionResult {
        let keysSaved: string[] = [];
        let have_projection = false;
        projection = projection || {};

        if ((projection as { projection?: Record<string, unknown> }).projection && typeof (projection as { projection?: Record<string, unknown> }).projection === 'object') {
            projection = (projection as { projection: Record<string, unknown> }).projection;
        }

        if ((projection as { fields?: Record<string, unknown> }).fields && typeof (projection as { fields?: Record<string, unknown> }).fields === 'object') {
            projection = (projection as { fields: Record<string, unknown> }).fields;
        }

        for (const k in projection) {
            have_projection = true;
            if (projection[k] === 1) {
                keysSaved.push(k);
            }
        }
        return { 'keys': keysSaved, 'have_projection': have_projection };
    }

    /**
     * Invalidate specific cache
     * @param collection - name of the collection where to update data
     * @param query - query for the document
     * @param projection - which fields to return
     * @param multi - true if multiple documents
     */
    invalidate(collection: string, query: Record<string, unknown>, projection: Record<string, unknown> | undefined, multi: boolean): void {
        const id = JSON.stringify(query) + '_' + multi;
        if (!this.data[collection]) {
            this.data[collection] = {};
        }
        if (this.data[collection][id] && !this.data[collection][id].promise) {
            delete this.data[collection][id];
        }
    }

    /**
     * Cache data read from database
     * @param collection - name of the collection where to update data
     * @param id - id of the cache
     * @param query - query for the document
     * @param projection - which fields to return
     * @param data - data from database
     * @param multi - true if multiple documents
     */
    cache(
        collection: string,
        id: string,
        query: Record<string, unknown>,
        projection: Record<string, unknown> | undefined,
        data: unknown,
        multi: boolean
    ): void {
        if (this.process) {
            this.data[collection][id] = {
                query: query,
                data: data,
                projection: projection,
                last_used: Date.now(),
                last_updated: Date.now(),
                multi: multi
            };
        }
    }
}

/**
 * Return promise or callback based on params
 * @param promise - promise for data
 * @param callback - callback to call
 * @returns Returned promise
 */
function promiseOrCallback(promise: Promise<unknown>, callback?: (err: Error | null, data: unknown) => void): Promise<unknown> | void {
    if (typeof callback === 'function') {
        return promise.then(function(data) {
            callback(null, data);
        })
            .catch(function(err) {
                callback(err, null);
            });
    }
    return promise;
}

export { Cacher };
export type { CacherOptions, CacheEntry, ProjectionResult, Database };
