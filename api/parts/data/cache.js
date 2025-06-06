'use strict';

const log = require('../../utils/log.js')('cache:' + process.pid),
    // common = require('../../utils/common.js'),
    { CentralWorker, CentralMaster } = require('../jobs/ipc.js'),
    { Jsonable } = require('../../utils/models'),
    LRU = require('lru-cache'),
    config = require('../../config.js');

const CENTRAL = 'cache', OP = {INIT: 'i', PURGE: 'p', READ: 'r', WRITE: 'w', UPDATE: 'u'};
// new job: {o: 2, k: 'ObjectId', g: 'jobs', d: '{"name": "jobs:clean", "status": 0, ...}'}
// job update: {o: 3, k: 'ObjectId', g: 'jobs', d: '{"status": 1}'}
// job retreival: {o: 1, k: 'ObjectId', g: 'jobs'}
// job removal: {o: 2, k: 'ObjectId', g: 'jobs', d: null}
// job removal from cache: {o: 0, k: 'ObjectId', g: 'jobs'}

/**
 * Get value in nested objects
 * @param  {object} obj         - object to checl
 * @param  {string|array} is    - keys for nested value
 * @param  {any} value          - if provided acts as setter setting this value in nested object
 * @return {varies} returns value in provided key in nested object
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
        this.lru = new LRU({max: size || 10000, ttl: age || Number.MAX_SAFE_INTEGER, dispose: dispose, noDisposeOnSet: true, updateAgeOnGet: true});
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
class CacheWorker {
    /**
     * Constructor
     *
     * @param  {Number} size max number of cache groups
     */
    constructor(size = 100) {
        this.data = new DataStore(size);
        this.started = false;

        this.ipc = new CentralWorker(CENTRAL, (m, reply) => {
            let {o, k, g, d} = m || {};

            if (!g) {
                return;
            }
            log.d('handling %s: %j', reply ? 'reply' : 'broadcast', m);

            let store = this.data.read(g);

            if (o === OP.INIT) {
                this.data.write(g, new DataStore(d.size, d.age, undefined, d.Cls));
                return;
            }
            else if (!store) {
                log.d('Group store is not initialized');
                return;
            }

            if (o === OP.PURGE) {
                if (k) {
                    store.write(k, null);
                }
                else { // purgeAll
                    store.iterate(id => store.write(id, null));
                }
            }
            else if (o === OP.READ) {
                store.write(k, d);
            }
            else if (o === OP.WRITE) {
                store.write(k, d);
            }
            else if (o === OP.UPDATE) {
                store.update(k, d);
            }
            else {
                throw new Error(`Illegal cache operaion: ${o}, ${k}, ${g}, ${d}`);
            }

            // store.iterate((k, v) => {
            //     log.d('have %s: %j', k, v);
            // });
        });
    }

    /**
     * Start listening to IPC messages
     */
    async start() {
        if (this.started === true) {
            return;
        }

        if (this.started === false) {
            log.d('starting worker');
            this.started = new Promise((resolve, reject) => {
                let timeout = setTimeout(() => {
                    reject(new Error('Failed to start CacheWorker on timeout'));
                }, 10000);
                this.ipc.attach();
                this.ipc.request({o: OP.INIT}).then(ret => {
                    log.d('got init response: %j', ret);
                    Object.keys(ret).forEach(g => {
                        if (!this.data.read(g)) {
                            this.data.write(g, new DataStore(ret[g].size, ret[g].age, undefined, ret[g].Cls));
                            if (ret[g].data) {
                                log.d('got %d data objects in init response', Object.keys(ret[g].data).length);
                                for (let k in ret[g].data) {
                                    this.data.read(g).write(k, ret[g].data[k]);
                                }
                            }
                        }
                    });
                    this.started = true;
                    clearTimeout(timeout);
                    resolve();
                });
            });
        }

        await this.started;
    }

    /**
     * Stop worker
     */
    async stop() {
        this.ipc.detach();
    }

    /**
     * Write data to cache:
     * - send a write to the master;
     * - wait for a response with write status;
     * - write the data to local copy and return it in case of success, throw error otherwise.
     *
     * @param  {String} group group key
     * @param  {String} id    data key
     * @param  {Object} data  data to store
     * @return {Object}       data if succeeded, null otherwise, throws in case of an error
     */
    async write(group, id, data) {
        await this.start();

        if (!group || !id || !data || typeof id !== 'string') {
            throw new Error('Where are my args?');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`writing ${group}:${id}`);
        let rsp = await this.ipc.request({o: OP.WRITE, g: group, k: id, d: data instanceof Jsonable ? data.json : data});
        if (rsp) {
            this.data.read(group).write(id, rsp);
        }

        return this.has(group, id);
    }

    /**
     * Update data in the cache:
     * - send an update to the master;
     * - wait for a response with update status;
     * - update the data in the local copy and return updated object in case of success, throw error otherwise.
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @param  {Object} update data to store
     * @return {Object}        data if succeeded, null otherwise, throws in case of an error
     */
    async update(group, id, update) {
        await this.start();

        if (!group || !id || !update || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`updating ${group}:${id}`);
        let rsp = await this.ipc.request({o: OP.UPDATE, g: group, k: id, d: update}),
            store = this.data.read(group);
        if (rsp) {
            store.update(id, rsp);
        }
        else {
            store.remove(id);

        }
        return this.has(group, id);
    }

    /**
     * Remove a record from cache.
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @return {Boolean}       true if removed
     */
    async remove(group, id) {
        await this.start();

        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`removing ${group}:${id}`);
        await this.ipc.request({o: OP.WRITE, g: group, k: id, d: null});
        let store = this.data.read(group);
        if (store) {
            store.remove(id);
        }
        return this.has(group, id) === null;
    }

    /**
     * Remove a record from cache.
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @return {Boolean}       true if removed
     */
    async purge(group, id) {
        await this.start();

        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`purging ${group}:${id}`);
        await this.ipc.request({o: OP.PURGE, g: group, k: id});
        let store = this.data.read(group);
        if (store) {
            store.remove(id);
        }
        return this.has(group, id) === null;
    }

    /**
     * Remove from cache all records for a given group.
     *
     * @param  {String} group  group key
     */
    async purgeAll(group) {
        await this.start();

        if (!group) {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`purging ${group}`);
        await this.ipc.request({o: OP.PURGE, g: group});
        let store = this.data.read(group);
        store.iterate(id => store.write(id, null));
    }

    /**
     * Read a record from cache:
     * - from local copy if exists;
     * - send a read request to master otherwise.
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @return {Object}        data if any, null otherwise
     */
    async read(group, id) {
        await this.start();

        if (!group || !id) {
            throw new Error('Where are my args?!');
        }
        let data = this.has(group, id);
        if (data) {
            return data;
        }
        else {
            let rsp = await this.ipc.request({o: OP.READ, g: group, k: id});
            if (rsp) {
                let store = this.data.read(group);
                if (!store) {
                    throw new Error(`No store for a group ${group}?!`);
                    // store = this.data.write(group, new DataStore(this.size));
                }
                store.write(id, rsp);
            }
            return this.has(group, id);
        }
    }

    /**
     * Check if local copy has data under the key.
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @return {Object}        data if any, null otherwise
     */
    has(group, id) {
        if (!group) {
            throw new Error('Where are my args?!');
        }
        let store = this.data.read(group);
        if (id) {
            return store && store.read(id) || null;
        }
        else {
            return store;
        }
    }

    /**
     * Just a handy method which returns an object with partials with given group.
     *
     * @param  {String} group group name
     * @return {Object}       object with all the {@code CacheWorker} methods without group
     */
    cls(group) {
        return {
            read: this.read.bind(this, group),
            write: this.write.bind(this, group),
            update: this.update.bind(this, group),
            remove: this.remove.bind(this, group),
            purge: this.purge.bind(this, group),
            purgeAll: this.purgeAll.bind(this, group),
            has: this.has.bind(this, group),
            iterate: f => {
                let g = this.data.read(group);
                if (g) {
                    g.iterate(f);
                }
                else {
                    log.e('no cache group %s to iterate on', group);
                }
            }
        };
    }
}

/**
 * Cache instance for master process:
 * - listen for requests from workers;
 * - call group operators to read/write/udpate
 */
class CacheMaster {
    /**
     * Constructor
     *
     * @param  {Number} size max number of cache groups
     */
    constructor(size = 100) {
        this.data = new DataStore(size, Number.MAX_SAFE_INTEGER);
        this.operators = {};
        this.initialized = {};
        this.delayed_messages = [];
        this.ipc = new CentralMaster(CENTRAL, ({o, g, k, d}, reply, from) => {
            log.d('handling %s: %j / %j / %j / %j', reply ? 'reply' : 'broadcast', o, g, k, d);

            if (o === OP.INIT) {
                this.initialized[from] = true;
                let ret = {};
                this.data.iterate((group, store) => {
                    let data = {};
                    store.iterate((key, obj) => {
                        data[key] = obj instanceof Jsonable ? obj.json : obj;
                    });
                    ret[group] = {size: store.size, age: store.age, Cls: store.Cls, data};
                });
                setImmediate(() => {
                    let remove = [];
                    this.delayed_messages.filter(arr => arr[0] === from).forEach(arr => {
                        remove.push(arr);
                        this.ipc.send(arr[0], arr[1]);
                    });
                    if (remove.length) {
                        log.d('sent %d delayed messages after %d worker\'s init', remove.length, from);
                        remove.forEach(m => {
                            const i = this.delayed_messages.indexOf(m);
                            if (i !== -1) {
                                this.delayed_messages.splice(i, 1);
                            }
                        });
                    }
                });
                return ret;
            }

            let store = this.data.read(g);
            if (!store) {
                log.d(`No store for group ${g}`);
                throw new Error('No such store ' + g);
            }

            if (o === OP.PURGE) {
                if (k) {
                    return this.purge(g, k, from);
                }
                else {
                    return this.purgeAll(g, from);
                }
            }
            else if (o === OP.READ) {
                return this.read(g, k, from);
            }
            else if (o === OP.WRITE) {
                return this.write(g, k, d, from);
            }
            else if (o === OP.UPDATE) {
                return this.update(g, k, d, from);
            }
            else if (o === OP.REMOVE) {
                return this.remove(g, k, from);
            }
            else {
                throw new Error(`Illegal cache operaion: ${o}, ${k}, ${g}, ${d}`);
            }
        });
    }

    /**
     * Attach to IPC
     *
     * @return {Promise<undefined>} void
     */
    async start() {
        this.ipc.attach();
        log.d('started master');
    }

    /**
     * Detaches IPC instance
     */
    stop() {
        this.ipc.detach();
    }

    /**
     * Register a set of operators for a particular cache group.
     *
     * @param  {String} group            group key
     * @param  {Function} options.init   initializer - an "async () => [Object]" kind of function, preloads data to cache on startup
     * @param  {string[]} options.Cls    class - an optional array of ["require path", "export name"] which resolves to a Jsonable subclass to construct instances
     * @param  {Function} options.read   reader - an "async (key) => Object" kind of function, returns data to cache if any for the key supplied
     * @param  {Function} options.write  writer - an "async (key, data) => Object" kind of function, persists the data cached if needed (must return the data persisted on success)
     * @param  {Function} options.update updater - an "async (key, update) => Object" kind of function, updates persisted data if needed
     * @param  {Function} options.remove remover - an "async (key) => Object" kind of function, removes persisted data if needed
     * @param  {int} age                 how long in ms to keep records in memory for the group
     * @param  {int} size                how much records to keep in memory for the group
     */
    init(group, {init, Cls, read, write, update, remove}, size = null, age = null) {
        this.operators[group] = {init, Cls, read, write, update, remove};

        if (!size && size !== 0) {
            size = config.api && config.api.cache && config.api.cache[group] && config.api.cache[group].size !== undefined ? config.api.cache[group].size : 10000;
        }

        if (!age && age !== 0) {
            age = config.api && config.api.cache && config.api.cache[group] && config.api.cache[group].age !== undefined ? config.api.cache[group].age : Number.MAX_SAFE_INTEGER;
        }

        this.data.write(group, new DataStore(size, age, k => {
            this.ipc.send(0, {o: OP.PURGE, g: group, k});
        }, Cls));

        this.ipc.send(0, {o: OP.INIT, g: group, d: {size, age, Cls}});

        init().then(arr => {
            (arr || []).forEach(([k, d]) => {
                this.data.read(group).write(k, d);
                const msg = {o: OP.READ, g: group, k, d: d && (d instanceof Jsonable) ? d.json : d};
                for (const pid in this.ipc.workers) {
                    if (this.initialized[pid]) {
                        this.ipc.send(parseInt(pid), msg);
                    }
                    else {
                        this.delayed_messages.push([parseInt(pid), msg]);
                    }
                }
            });
        }, log.e.bind(log, 'Error during initialization of cache group %s', group));
    }

    /**
     * Write data to the cache
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @param  {Object} data   data to store
     * @param  {int} from      originating pid if any
     * @return {Object}        data if succeeded, null otherwise, throws in case of an error
     */
    async write(group, id, data, from = 0) {
        if (!group || !id || (data === undefined) || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`writing ${group}:${id}: %j`, data);

        if (group in this.operators) {
            return this.operators[group][data === null ? 'remove' : 'write'](id, data).then(rc => {
                if (rc) {
                    if (data === null) {
                        rc = null;
                    }
                    if (rc instanceof Jsonable) {
                        rc = rc.json;
                    }
                    this.data.read(group)[data === null ? 'remove' : 'write'](id, rc);
                    this.ipc.send(-from, {o: OP.WRITE, g: group, k: id, d: rc});
                    return data === null ? true : rc;
                }
                else {
                    return null;
                }
            });
        }
        else {
            return null;
        }
    }

    /**
     * Update data in the cache
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @param  {Object} update data to store
     * @param  {int} from      originating pid if any
     * @return {Object}        data if succeeded, null otherwise, throws in case of an error
     */
    async update(group, id, update, from = 0) {
        if (!group || !id || !update || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`updating ${group}:${id} with %j`, update);

        if (group in this.operators) {
            return this.operators[group].update(id, update).then(() => {
                this.data.read(group).update(id, update);
                this.ipc.send(-from, {o: OP.UPDATE, g: group, k: id, d: update});
                return update;
            });
        }
        else {
            return null;
        }
    }

    /**
     * Remove a record from cache.
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @param  {int} from      originating pid if any
     * @return {Boolean}       true if removed
     */
    async remove(group, id, from) {
        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }

        log.d(`removing ${group}:${id}`);
        if (group in this.operators) {
            return this.operators[group].remove(id).then(rc => {
                if (rc) {
                    this.data.read(group).remove(id);
                    this.ipc.send(-from, {o: OP.WRITE, g: group, k: id, d: null});
                    return true;
                }
                else {
                    return null;
                }
            });
        }
        else {
            return null;
        }
    }

    /**
     * Remove a record from cache.
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @param  {int} from      originating pid if any
     * @return {Boolean}       true if removed
     */
    async purge(group, id, from = 0) {
        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }
        log.d(`purging ${group}:${id}`);

        this.data.read(group).write(id, null);
        this.ipc.send(-from, {o: OP.PURGE, g: group, k: id});
        return true;
    }

    /**
     * Remove from cache all record for given group.
     *
     * @param  {String} group  group key
     * @param  {int} from      originating pid if any
     * @return {Boolean}       true if removed
     */
    async purgeAll(group, from = 0) {
        if (!group) {
            throw new Error('Where are my args?!');
        }
        log.d(`purging ${group}`);

        let grp = this.data.read(group);
        grp.iterate(k => grp.write(k, null));
        this.ipc.send(-from, {o: OP.PURGE, g: group});
        return true;
    }

    /**
     * Read a record from cache:
     * - from local copy if exists;
     * - send a read request to master otherwise.
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @param  {int} from      originating pid if any
     * @return {Object}        data if any, null otherwise
     */
    async read(group, id, from = 0) {
        if (!group || !id || typeof id !== 'string') {
            throw new Error('Where are my args?!');
        }
        else if (!this.data.read(group)) {
            throw new Error('No such cache group');
        }

        let store = this.data.read(group),
            rc = store.read(id);
        if (rc) {
            return rc;
        }
        else if (group in this.operators) {
            return this.operators[group].read(id).then(x => {
                if (x) {
                    this.ipc.send(-from, {o: OP.READ, g: group, k: id, d: x instanceof Jsonable ? x.json : x});
                    store.write(id, x);
                    return x;
                }
                else {
                    return null;
                }
            });
        }
        else {
            return null;
        }
    }

    /**
     * Check if local copy has data under the key.
     *
     * @param  {String} group  group key
     * @param  {String} id     data key
     * @return {Object}        data if any, undefined otherwise
     */
    has(group, id) {
        if (!group) {
            throw new Error('Where are my args?!');
        }
        let store = this.data.read(group);
        if (id) {
            return store && store.read(id) || null;
        }
        else {
            return store;
        }
    }

    /**
     * Just a handy method which returns an object with partials with given group.
     *
     * @param  {String} group group name
     * @return {Object}       object with all the {@code CacheWorker} methods without group
     */
    cls(group) {
        return {
            read: this.read.bind(this, group),
            write: this.write.bind(this, group),
            update: this.update.bind(this, group),
            remove: this.remove.bind(this, group),
            purge: this.purge.bind(this, group),
            purgeAll: this.purgeAll.bind(this, group),
            has: this.has.bind(this, group),
            iterate: f => {
                let g = this.data.read(group);
                if (g) {
                    g.iterate(f);
                }
                else {
                    log.e('no cache group %s to iterate on', group);
                }
            }
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


module.exports = {CacheMaster, CacheWorker, TestDataClass};
