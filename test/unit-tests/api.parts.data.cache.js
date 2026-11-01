'use strict';

/**
* When the master's copy of a cache group drops an entry (size eviction, TTL expiry or
* removal), CacheMaster broadcasts PURGE {g, k} so every worker drops key k as well.
* lru-cache calls dispose(value, key, reason): the master must send the key, not the
* cached value, or workers look up "[object Object]" and keep the entry.
*
* The master's IPC is replaced with a recorder, so this runs without cluster workers.
*/

const should = require('should');
const { CacheMaster } = require('../../api/parts/data/cache.js');

const PURGE = 'p';

/**
 * A master with a recording IPC and one group backed by an in-memory store
 * @param {number} size - entries the group keeps
 * @param {number} age - ms the group keeps an entry
 * @returns {object} {cache, purged}: purged lists the keys of PURGE broadcasts for the group
 */
function masterWithGroup(size, age) {
    const cache = new CacheMaster();
    const sent = [];
    cache.ipc = {send: (to, msg) => sent.push(msg), request: async() => {}, workers: {}, detach: () => {}};
    const db = {};
    cache.init('g', {
        init: async() => [],
        read: async key => db[key] || null,
        write: async(key, data) => {
            db[key] = data;
            return data;
        },
        update: async() => {},
        remove: async key => {
            const had = key in db;
            delete db[key];
            return had;
        }
    }, size, age);
    return {cache, purged: () => sent.filter(m => m.o === PURGE && m.g === 'g').map(m => m.k)};
}

describe('CacheMaster tells workers which key it dropped', function() {
    it('broadcasts the evicted key when the group is full', async function() {
        const {cache, purged} = masterWithGroup(2);
        await cache.write('g', 'k1', {v: 1});
        await cache.write('g', 'k2', {v: 2});
        await cache.write('g', 'k3', {v: 3});
        should.deepEqual(purged(), ['k1']);
    });

    it('broadcasts the expired key once its age has passed', async function() {
        const {cache, purged} = masterWithGroup(10, 50);
        await cache.write('g', 'k1', {v: 1});
        await new Promise(resolve => setTimeout(resolve, 80));
        should(cache.has('g', 'k1')).equal(null);
        should.deepEqual(purged(), ['k1']);
    });

    it('broadcasts the removed key, never the cached value', async function() {
        const {cache, purged} = masterWithGroup(10);
        await cache.write('g', 'k1', {v: 1});
        await cache.remove('g', 'k1');
        purged().length.should.be.above(0);
        purged().forEach(k => should(k).equal('k1'));
    });
});
