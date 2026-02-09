/**
 * Cache module for Countly API
 * @module api/parts/data/cache
 */

import { createRequire } from 'module';

// createRequire needed for CJS modules without ES exports
// @ts-expect-error TS1470 - import.meta is valid at runtime (Node 22 treats .ts with imports as ESM)
const require = createRequire(import.meta.url);
const logModule = require('../../utils/log.js');
const { Jsonable } = require('../../utils/models.js');
const LRU = require('lru-cache');
const config = require('../../config.js');

const log = logModule('cache') as { d: (...args: unknown[]) => void; e: (...args: unknown[]) => void };

/**
 * Dispose callback type
 */
type DisposeCallback = ((value: unknown, key: string) => void) | null;

/**
 * Class info type
 */
type ClassInfo = [string, string] | undefined;

/**
 * Operators interface
 */
interface Operators {
    init: () => Promise<Array<[string, unknown]>>;
    Cls?: ClassInfo;
    read: (id: string) => Promise<unknown>;
    write: (id: string, data: unknown) => Promise<unknown>;
    update: (id: string, update: Record<string, unknown>) => Promise<unknown>;
    remove: (id: string) => Promise<boolean>;
}

/**
 * Get value in nested objects
 * @param obj - object to check
 * @param is - keys for nested value
 * @param value - if provided acts as setter setting this value in nested object
 * @returns returns value in provided key in nested object
 */
function dot(obj: Record<string, unknown>, is: string | string[], value?: unknown): unknown {
    if (typeof is === 'string') {
        return dot(obj, is.split('.'), value);
    }
    else if (is.length === 1 && value !== undefined) {
        obj[is[0]] = value;
        return value;
    }
    else if (is.length === 0) {
        return obj;
    }
    else if (!obj) {
        return obj;
    }
    else {
        return dot(obj[is[0]] as Record<string, unknown>, is.slice(1), value);
    }
}

/**
 * Fifo size-bound key-value store.
 */
class DataStore {
    private size: number;
    private age: number;
    private lru: InstanceType<typeof LRU>;
    private Cls?: ClassInfo;
    private Clas?: new (data: Record<string, unknown>) => typeof Jsonable;

    /**
     * Constructor
     * @param size - max number of items to store
     * @param age - max life of an object in ms
     * @param dispose - called whenever object is shifted from cache
     * @param Cls - class for data objects
     */
    constructor(size?: number, age?: number, dispose?: DisposeCallback, Cls?: ClassInfo) {
        this.size = size || 10000;
        this.age = age || Number.MAX_SAFE_INTEGER;
        this.lru = new LRU({
            max: this.size,
            ttl: this.age,
            dispose: dispose,
            noDisposeOnSet: true,
            updateAgeOnGet: true
        });
        if (Cls) {
            this.Cls = Cls;
            this.Clas = require('../../../' + Cls[0])[Cls[1]];
        }
    }

    /**
     * Length getter
     * @returns current store size
     */
    get length(): number {
        return this.lru.size;
    }

    /**
     * Read value by key
     * @param id - key
     * @returns value or undefined if no value under such key is stored
     */
    read(id: string | { toString: () => string }): unknown {
        if (id && (id as { toString: () => string }).toString) {
            return this.lru.get(id.toString());
        }
        return undefined;
    }

    /**
     * Store value
     * @param id - key
     * @param data - value (pass null to delete data record)
     * @returns returns the data supplied if it was stored, undefined otherwise
     */
    write(id: string, data: unknown): unknown {
        if (data) {
            let dataToStore = data;
            if (this.Clas && !(data instanceof this.Clas)) {
                dataToStore = new this.Clas(data as Record<string, unknown>);
            }
            this.lru.set(id.toString(), dataToStore);
            return dataToStore;
        }
        else if (!id) {
            this.lru.clear();
        }
        else if (this.read(id) !== null) {
            this.lru.delete(id.toString());
        }
        return undefined;
    }

    /**
     * Update value stored under key with $set-like update
     * @param id - key
     * @param set - flattened object of {attr1: 2, 'obj.attr2': 3} kind
     * @returns true if updated, false in case no object is stored under key
     */
    update(id: string, set: Record<string, unknown>): boolean {
        const existing = this.read(id) as Record<string, unknown> | { updateData: (set: Record<string, unknown>) => void } | undefined;
        if (!existing) {
            return false;
        }
        if (this.Clas && typeof (existing as { updateData?: unknown }).updateData === 'function') {
            (existing as { updateData: (set: Record<string, unknown>) => void }).updateData(set);
        }
        else {
            for (const k in set) {
                dot(existing as Record<string, unknown>, k, set[k]);
            }
        }
        return true;
    }

    /**
     * Remove an item from the store
     * @param id - id of the item to remove
     */
    remove(id: string): void {
        this.write(id, null);
    }

    /**
     * Iterate through all stored items
     * @param f - function(id, item) to call with every item
     */
    iterate(f: (id: string, item: unknown) => void): void {
        this.lru.forEach((v: unknown, k: string) => f(k, v));
    }
}

/**
 * Cache instance for a worker process:
 * - keeps local copy of a cache;
 * - listens for updates from master;
 * - notifies master about updates;
 * - loads data from master when local copy misses a particular key.
 */
class Cache {
    private data: DataStore;
    private operators: Record<string, Operators>;

    /**
     * Constructor
     * @param size - max number of cache groups
     */
    constructor(size = 100) {
        this.data = new DataStore(size);
        this.operators = {};
    }

    /**
     * Register a set of operators for a particular cache group.
     * @param group - group key
     * @param options - operator options
     * @param options.init - initializer - an "async () => [Object]" kind of function, preloads data to cache on startup
     * @param options.Cls - class - an optional array of ["require path", "export name"] which resolves to a Jsonable subclass
     * @param options.read - reader - an "async (key) => Object" kind of function
     * @param options.write - writer - an "async (key, data) => Object" kind of function
     * @param options.update - updater - an "async (key, update) => Object" kind of function
     * @param options.remove - remover - an "async (key) => Object" kind of function
     * @param size - how much records to keep in memory for the group
     * @param age - how long in ms to keep records in memory for the group
     */
    async init(
        group: string,
        { init, Cls, read, write, update, remove }: Operators,
        size: number | null = null,
        age: number | null = null
    ): Promise<void> {
        this.operators[group] = { init, Cls, read, write, update, remove };

        if (!size && size !== 0) {
            size = config.api?.cache?.[group]?.size ?? 10000;
        }

        if (!age && age !== 0) {
            age = config.api?.cache?.[group]?.age ?? Number.MAX_SAFE_INTEGER;
        }

        this.data.write(group, new DataStore(size as number, age as number, null, Cls));

        try {
            const arr = await init();
            (arr || []).forEach(([k, d]) => {
                (this.data.read(group) as DataStore).write(k, d);
            });
        }
        catch (err) {
            log.e('Error during initialization of cache group %s', group, err);
        }
    }

    /**
     * Write data to the cache
     * @param group - group key
     * @param id - data key
     * @param data - data to store
     * @returns data if succeeded, null otherwise, throws in case of an error
     */
    async write(group: string, id: string, data: unknown): Promise<unknown> {
        if (!group || !id || (data === undefined) || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`writing ${group}:${id}: %j`, data);

        if (group in this.operators) {
            const rc = await this.operators[group][data === null ? 'remove' : 'write'](id, data);
            if (rc) {
                if (data === null) {
                    (this.data.read(group) as DataStore).remove(id);
                    return true;
                }
                const toStore = rc instanceof Jsonable ? (rc as { json: Record<string, unknown> }).json : rc;
                (this.data.read(group) as DataStore).write(id, toStore);
                return toStore;
            }
            return null;
        }
        return null;
    }

    /**
     * Update data in the cache
     * @param group - group key
     * @param id - data key
     * @param update - data to store
     * @returns data if succeeded, null otherwise, throws in case of an error
     */
    async update(group: string, id: string, update: Record<string, unknown>): Promise<Record<string, unknown> | null> {
        if (!group || !id || !update || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`updating ${group}:${id} with %j`, update);

        if (group in this.operators) {
            await this.operators[group].update(id, update);
            (this.data.read(group) as DataStore).update(id, update);
            return update;
        }
        return null;
    }

    /**
     * Remove a record from cache.
     * @param group - group key
     * @param id - data key
     * @returns true if removed
     */
    async remove(group: string, id: string): Promise<boolean> {
        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`removing ${group}:${id}`);
        (this.data.read(group) as DataStore).remove(id);
        return true;
    }

    /**
     * Remove a record from cache.
     * @param group - group key
     * @param id - data key
     * @returns true if removed
     */
    async purge(group: string, id: string): Promise<boolean> {
        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`purging ${group}:${id}`);
        (this.data.read(group) as DataStore).write(id, null);
        return true;
    }

    /**
     * Remove from cache all records for a given group.
     * @param group - group key
     */
    async purgeAll(group: string): Promise<void> {
        if (!group) {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`purging ${group}`);
        (this.data.read(group) as DataStore).iterate(id => (this.data.read(group) as DataStore).write(id, null));
    }

    /**
     * Read data from the cache
     * @param group - group key
     * @param id - data key
     * @returns data if succeeded, null otherwise, throws in case of an error
     */
    async read(group: string, id: string): Promise<unknown> {
        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }

        const data = this.has(group, id);
        if (data) {
            return data;
        }

        if (group in this.operators) {
            const rc = await this.operators[group].read(id);
            if (rc) {
                const toStore = rc instanceof Jsonable ? (rc as { json: Record<string, unknown> }).json : rc;
                (this.data.read(group) as DataStore).write(id, toStore);
                return toStore;
            }
        }
        return null;
    }

    /**
     * Check if data exists in cache
     * @param group - group key
     * @param id - data key
     * @returns data if exists, null otherwise
     */
    has(group: string, id: string): unknown {
        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }

        return (this.data.read(group) as DataStore).read(id);
    }

    /**
     * Get class interface for a group
     * @param group - group name
     * @returns object with read/write/update methods bound to the group
     */
    cls(group: string): {
        read: (id: string) => Promise<unknown>;
        write: (id: string, data: unknown) => Promise<unknown>;
        update: (id: string, update: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
        remove: (id: string) => Promise<boolean>;
    } {
        return {
            read: this.read.bind(this, group),
            write: this.write.bind(this, group),
            update: this.update.bind(this, group),
            remove: this.remove.bind(this, group)
        };
    }
}

/**
 * Data class for tests
 */
class TestDataClass extends Jsonable {
    /**
     * @returns true
     */
    get isClassInstance(): boolean {
        return true;
    }
}

export { Cache, TestDataClass };
export type { Operators, ClassInfo, DisposeCallback };
