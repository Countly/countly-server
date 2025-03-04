'use strict';

const log = require('../../utils/log.js')('cache'),
    { Jsonable } = require('../../utils/models'),
    LRU = require('lru-cache'),
    config = require('../../config.js');

// const CENTRAL = 'cache', OP = {INIT: 'i', PURGE: 'p', READ: 'r', WRITE: 'w', UPDATE: 'u'};
// new job: {o: 2, k: 'ObjectId', g: 'jobs', d: '{"name": "jobs:clean", "status": 0, ...}'}
// job update: {o: 3, k: 'ObjectId', g: 'jobs', d: '{"status": 1}'}
// job retreival: {o: 1, k: 'ObjectId', g: 'jobs'}
// job removal: {o: 2, k: 'ObjectId', g: 'jobs', d: null}
// job removal from cache: {o: 0, k: 'ObjectId', g: 'jobs'}

/**
 * Get value in nested objects
 * @param  {object} obj         - object to check
 * @param  {string|array} is    - keys for nested value
 * @param  {any} value          - if provided acts as setter setting this value in nested object
 * @return {varies} returns value in provided key in nested object
 * @note
 * TODO: change to iterative if profiling finds memory issues
 */
const dot = function(obj, is, value) {
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
        return dot(obj[is[0]], is.slice(1), value);
    }
};

/**
 * Fifo size-bound key-value store.
 */
class DataStore {
    /**
     * Constructor
     * @param  {int} size           max number of items to store
     * @param  {int} age            max life of an object in ms
     * @param  {Function} dispose   called whenever object is shifted from cache
     * @param  {Class} Cls          class for data objects
     */
    constructor(size, age, dispose, Cls) {
        this.size = size;
        this.age = age;
        this.lru = new LRU({
            max: size || 10000,
            ttl: age || Number.MAX_SAFE_INTEGER,
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
     * @return {int} current store size
     */
    get length() {
        return this.lru.size;
    }

    /**
     * Read value by key
     *
     * @param  {String} id key
     * @return {Any}    value or undefined if no value under such key is stored
     */
    read(id) {
        if (id && id.toString) {
            return this.lru.get(id.toString());
        }
    }

    /**
     * Store value
     *
     * @param  {String} id              key
     * @param  {Object} data            value (pass null to delete data record)
     * @return {Object}                 returns the data supplied if it was stored, undefined otherwise
     */
    write(id, data) {
        if (data) {
            if (this.Clas && !(data instanceof this.Clas)) {
                data = new this.Clas(data);
            }
            this.lru.set(id.toString(), data);
            return data;
        }
        else if (!id) {
            this.lru.clear();
        }
        else if (this.read(id) !== null) {
            this.lru.delete(id.toString());
        }
    }

    /**
     * Update value stored under key with $set-like update
     *
     * @param  {String} id  key
     * @param  {Object} set flattened object of {attr1: 2, 'obj.attr2': 3} kind
     * @return {Boolean}    true if updated, false in case no object is stored under key
     */
    update(id, set) {
        let existing = this.read(id);
        if (!existing) {
            return false;
        }
        if (this.Clas) {
            existing.updateData(set);
        }
        else {
            for (let k in set) {
                dot(existing, k, set[k]);
            }
        }
        return true;
    }

    /**
     * Remove an item from the store
     * @param {String} id id of the item to remove
     */
    remove(id) {
        this.write(id, null);
    }

    /**
     * Iterate through all stored items
     * @param {Function} f function(id, item) to call with every item
     */
    iterate(f) {
        this.lru.forEach((v, k) => f(k, v));
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
    /**
     * Constructor
     * @param  {Number} size max number of cache groups
     */
    constructor(size = 100) {
        this.data = new DataStore(size);
        this.operators = {};
    }

    /**
     * Register a set of operators for a particular cache group.
     *
     * @param  {String} group            group key
     * @param  {Function} options.init   initializer - an "async () => [Object]" kind of function, preloads data to cache on startup
     * @param  {string[]} options.Cls    class - an optional array of ["require path", "export name"] which resolves to a Jsonable subclass to construct instances
     * @param  {Function} options.read   reader - an "async (key) => Object" kind of function, returns data to cache if any for the key supplied
     * @param  {Function} options.write  writer - an "async (key, data) => Object" kind of function, persists the data cached if needed
     * @param  {Function} options.update updater - an "async (key, update) => Object" kind of function, updates persisted data if needed
     * @param  {Function} options.remove remover - an "async (key) => Object" kind of function, removes persisted data if needed
     * @param  {int} age                 how long in ms to keep records in memory for the group
     * @param  {int} size                how much records to keep in memory for the group
     */
    async init(group, {init, Cls, read, write, update, remove}, size = null, age = null) {
        this.operators[group] = {init, Cls, read, write, update, remove};

        if (!size && size !== 0) {
            size = config.api?.cache?.[group]?.size ?? 10000;
        }

        if (!age && age !== 0) {
            age = config.api?.cache?.[group]?.age ?? Number.MAX_SAFE_INTEGER;
        }

        this.data.write(group, new DataStore(size, age, null, Cls));

        try {
            const arr = await init();
            (arr || []).forEach(([k, d]) => {
                this.data.read(group).write(k, d);
            });
        }
        catch (err) {
            log.e('Error during initialization of cache group %s', group, err);
        }
    }

    /**
     * Write data to the cache
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @param  {Object} data   data to store
     * @return {Object}        data if succeeded, null otherwise, throws in case of an error
     */
    async write(group, id, data) {
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
                    this.data.read(group).remove(id);
                    return true;
                }
                const toStore = rc instanceof Jsonable ? rc.json : rc;
                this.data.read(group).write(id, toStore);
                return toStore;
            }
            return null;
        }
        return null;
    }

    /**
     * Update data in the cache
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @param  {Object} update data to store
     * @return {Object}        data if succeeded, null otherwise, throws in case of an error
     */
    async update(group, id, update) {
        if (!group || !id || !update || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`updating ${group}:${id} with %j`, update);

        if (group in this.operators) {
            await this.operators[group].update(id, update);
            this.data.read(group).update(id, update);
            return update;
        }
        return null;
    }

    /**
     * Remove a record from cache.
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @return {Boolean}       true if removed
     */
    async remove(group, id) {
        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`removing ${group}:${id}`);
        this.data.read(group).remove(id);
        return true;
    }

    /**
     * Remove a record from cache.
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @return {Boolean}       true if removed
     */
    async purge(group, id) {
        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`purging ${group}:${id}`);
        this.data.read(group).write(id, null);
        return true;
    }

    /**
     * Remove from cache all records for a given group.
     *
     * @param  {String} group  group key
     */
    async purgeAll(group) {
        if (!group) {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`purging ${group}`);
        this.data.read(group).iterate(id => this.data.read(group).write(id, null));
    }

    /**
     * Read data from the cache
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @return {Object}        data if succeeded, null otherwise, throws in case of an error
     */
    async read(group, id) {
        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }

        let data = this.has(group, id);
        if (data) {
            return data;
        }

        if (group in this.operators) {
            const rc = await this.operators[group].read(id);
            if (rc) {
                const toStore = rc instanceof Jsonable ? rc.json : rc;
                this.data.read(group).write(id, toStore);
                return toStore;
            }
        }
        return null;
    }

    /**
     * Check if data exists in cache
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @return {Object|null}   data if exists, null otherwise
     */
    has(group, id) {
        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }

        return this.data.read(group).read(id);
    }

    /**
     * Get class interface for a group
     * @param  {String} group group name
     * @return {Object}       object with read/write/update methods bound to the group
     */
    cls(group) {
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
     * @returns {boolean} true
     */
    get isClassInstance() {
        return true;
    }
}


module.exports = {Cache, TestDataClass};
