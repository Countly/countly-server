'use strict';

/**
* The master/worker cache (api/parts/data/cache.js) as the API runs it: CacheMaster in the
* cluster master, a CacheWorker in each forked worker, kept in sync over cluster IPC. Push
* keeps its streaming messages in it (cache group P).
*
* Each worker is a real cluster worker running test/unit-tests/helpers/cache-worker.js,
* which only carries out what this file asks, so every assertion runs here and fails the
* run. Waits are polls on the expected state, never fixed sleeps.
*/

const cluster = require('cluster');
const path = require('path');
const should = require('should');
const { CacheMaster, TestDataClass } = require('../../api/parts/data/cache.js');

const WORKER = path.join(__dirname, 'helpers', 'cache-worker.js');
const WAIT_MS = 10000;
const CLS = ['api/parts/data/cache', 'TestDataClass'];

/**
 * Retry an assertion until it passes or the wait runs out
 * @param {Function} check - async function that throws until the state is right
 * @returns {Promise} resolves once check passes
 */
async function eventually(check) {
    const until = Date.now() + WAIT_MS;
    for (;;) {
        try {
            return await check();
        }
        catch (e) {
            if (Date.now() > until) {
                throw e;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
}

/**
 * Fork a cluster worker running a CacheWorker and wait until its cache has started
 * @returns {Promise<object>} {call(op, ...args), stop()}
 */
function forkWorker() {
    const worker = cluster.fork();
    const pending = {};
    let next = 0;
    worker.on('message', m => {
        if (m && m.cacheTestReply && pending[m.cacheTestReply.id]) {
            const { id, result, error } = m.cacheTestReply;
            if (error) {
                pending[id].reject(new Error(error));
            }
            else {
                pending[id].resolve(result);
            }
            delete pending[id];
        }
    });
    const api = {
        call: (op, ...args) => new Promise((resolve, reject) => {
            const id = ++next;
            pending[id] = { resolve, reject };
            worker.send({ cacheTest: { id, op, args } });
        }),
        stop: () => new Promise(resolve => {
            if (worker.isDead()) {
                return resolve();
            }
            worker.once('exit', () => resolve());
            worker.kill();
        })
    };
    return new Promise((resolve, reject) => {
        worker.on('message', m => m && m.cacheTestReady && resolve(api));
        worker.once('exit', code => reject(new Error('cache worker exited before it started: ' + code)));
    });
}

/**
 * Cache operators backed by an in-memory store, as push's are backed by MongoDB
 * @param {object} db - key -> stored json
 * @returns {object} operators for CacheMaster.init
 */
function operators(db) {
    return {
        init: async() => Object.keys(db).map(k => [k, new TestDataClass(db[k])]),
        Cls: CLS,
        read: async key => key in db ? new TestDataClass(db[key]) : null,
        write: async(key, data) => {
            db[key] = data instanceof TestDataClass ? data.json : data;
            return new TestDataClass(db[key]);
        },
        update: async(key, update) => {
            if (key in db) {
                Object.assign(db[key], update);
            }
        },
        remove: async key => {
            const had = key in db;
            delete db[key];
            return had;
        }
    };
}

describe('Master/worker cache across cluster workers', function() {
    const db = {
        '1': {_id: '1', str: 'one'},
        '2': {_id: '2', str: 'two'}
    };
    const smallDb = {};
    const workers = [];
    let master, w1, w2, settings;

    before(async function() {
        settings = Object.assign({}, cluster.settings);
        // Forked workers run the helper, not this process's mocha or grunt command line.
        cluster.setupPrimary({ exec: WORKER, args: [] });
        master = new CacheMaster();
        await master.start();
        master.init('t', operators(db));
        master.init('small', operators(smallDb), 2);
        w1 = await forkWorker();
        w2 = await forkWorker();
        workers.push(w1, w2);
    });

    after(async function() {
        await Promise.all(workers.map(w => w.stop()));
        if (master) {
            master.stop();
        }
        cluster.setupPrimary({ exec: settings.exec || process.argv[1], args: settings.args || process.argv.slice(2) });
    });

    it('a worker starts with the entries the master preloaded, and gets nothing for an unknown key', async function() {
        should.deepEqual(await w1.call('has', 't', '1'), db['1']);
        should.deepEqual(await w1.call('has', 't', '2'), db['2']);
        should(await w1.call('read', 't', '3')).equal(null);
    });

    it('a write from one worker reaches the master and the other worker', async function() {
        should.deepEqual(await w1.call('write', 't', '3', {_id: '3', str: 'three'}), {_id: '3', str: 'three'});
        should.deepEqual((await master.read('t', '3')).json, {_id: '3', str: 'three'});
        should.deepEqual(db['3'], {_id: '3', str: 'three'});
        await eventually(async() => should.deepEqual(await w2.call('has', 't', '3'), {_id: '3', str: 'three'}));
    });

    it('an update from the master reaches every worker', async function() {
        await master.update('t', '1', {num: 7});
        const updated = {_id: '1', str: 'one', num: 7};
        should.deepEqual((await master.read('t', '1')).json, updated);
        await eventually(async() => should.deepEqual(await w1.call('has', 't', '1'), updated));
        await eventually(async() => should.deepEqual(await w2.call('has', 't', '1'), updated));
    });

    it('a removal from one worker reaches the master and the other worker', async function() {
        await w2.call('remove', 't', '2');
        should(master.has('t', '2')).equal(null);
        should(db).not.have.property('2');
        await eventually(async() => should(await w1.call('has', 't', '2')).equal(null));
        should(await w1.call('read', 't', '2')).equal(null);
    });

    it('a worker started later gets the current entries, not the preloaded ones', async function() {
        const w3 = await forkWorker();
        workers.push(w3);
        should.deepEqual(await w3.call('has', 't', '1'), {_id: '1', str: 'one', num: 7});
        should.deepEqual(await w3.call('has', 't', '3'), {_id: '3', str: 'three'});
        should(await w3.call('has', 't', '2')).equal(null);
    });

    it('a worker drops an entry the master evicts when the group is full', async function() {
        await master.write('small', 'a', {_id: 'a', str: 'A'});
        await master.write('small', 'b', {_id: 'b', str: 'B'});
        await eventually(async() => should.deepEqual(await w1.call('has', 'small', 'b'), {_id: 'b', str: 'B'}));
        // the worker reads 'a', so in its own copy of the group 'b' becomes the oldest entry,
        // while in the master's copy 'a' still is
        should.deepEqual(await w1.call('has', 'small', 'a'), {_id: 'a', str: 'A'});
        await master.write('small', 'c', {_id: 'c', str: 'C'});
        should(master.has('small', 'a')).equal(null);
        await eventually(async() => should.deepEqual(await w1.call('has', 'small', 'c'), {_id: 'c', str: 'C'}));
        // the worker's own eviction drops 'b'; only the master's purge drops 'a'
        await eventually(async() => should(await w1.call('has', 'small', 'a')).equal(null));
        // the entry is still stored, so reading it again fetches it from the master
        should.deepEqual(await w1.call('read', 'small', 'a'), {_id: 'a', str: 'A'});
    });

    it('a worker cannot write to a group the master never set up', async function() {
        await w1.call('write', 'nope', 'x', {_id: 'x'}).should.be.rejected();
        should(master.has('nope')).not.be.ok();
    });
});
