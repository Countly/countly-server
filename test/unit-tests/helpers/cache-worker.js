'use strict';

/**
* A cluster worker for test/unit-tests/api.parts.data.cache.cluster.js: it runs a real
* CacheWorker and does what the test in the master process asks over IPC, replying
* with the result. It asserts nothing itself, so every check runs in the master and a
* failure fails the mocha run. Not a test file: mocha selects test/<dir>/*.js only.
*/

const { CacheWorker, TestDataClass } = require('../../../api/parts/data/cache.js');

const cache = new CacheWorker();

/**
 * Plain JSON for a cached value
 * @param {object} value - cached value, a Jsonable or null
 * @returns {object|null} its json, or null
 */
function plain(value) {
    return value ? value.json : null;
}

const ops = {
    read: async(group, key) => plain(await cache.read(group, key)),
    has: async(group, key) => plain(cache.has(group, key)),
    write: async(group, key, data) => plain(await cache.write(group, key, new TestDataClass(data))),
    update: async(group, key, update) => plain(await cache.update(group, key, update)),
    remove: async(group, key) => {
        await cache.remove(group, key);
        return true;
    }
};

process.on('message', async m => {
    if (!m || !m.cacheTest) {
        return;
    }
    const { id, op, args } = m.cacheTest;
    try {
        process.send({ cacheTestReply: { id, result: await ops[op](...args) } });
    }
    catch (e) {
        process.send({ cacheTestReply: { id, error: e && e.message || String(e) } });
    }
});

cache.start().then(() => process.send({ cacheTestReady: true }));
