/**
 * The legacy dashboard's first-run setup (frontend/express/libs/members.js
 * `setup`, behind POST /setup) may only create the first global admin while the
 * `setup_admin_unique` index is confirmed, so two concurrent setups cannot both
 * create one. Without the index the `setup_admin` marker fences nothing, so setup
 * is refused instead of run unguarded.
 */
const assert = require('assert');

const plugins = require('../../plugins/pluginManager.js');
const authorize = require('../../api/utils/authorizer.js');
const membersUtility = require('../../frontend/express/libs/members.js');
const SETUP_ADMIN_INDEX_NAME = 'setup_admin_unique';

/**
 * A members collection whose count always reads 0 (as for requests that all
 * passed the count before any insert) and whose insert enforces the unique
 * partial index once createIndex has built it.
 * @param {object} [opts] - behaviour switches
 * @param {boolean} [opts.failIndex] - createIndex rejects
 * @param {Error} [opts.insertError] - insert fails with this error
 * @returns {object} {db, docs, inserts}
 */
function fakeDb(opts = {}) {
    const docs = [];
    const state = { indexBuilt: false, inserts: 0 };
    const members = {
        count(cb) {
            setImmediate(() => cb(null, 0));
        },
        createIndex(keys, options) {
            if (opts.failIndex) {
                return Promise.reject(new Error('not authorized to create index'));
            }
            assert.strictEqual(options.name, SETUP_ADMIN_INDEX_NAME);
            state.indexBuilt = true;
            return Promise.resolve(options.name);
        },
        insert(doc, options, cb) {
            state.inserts++;
            setImmediate(() => {
                if (opts.insertError) {
                    return cb(opts.insertError);
                }
                if (state.indexBuilt && doc.setup_admin === true && docs.some((d) => d.setup_admin === true)) {
                    return cb(Object.assign(new Error('E11000 duplicate key error'), { code: 11000 }));
                }
                doc._id = 'm' + docs.length;
                docs.push(doc);
                cb(null, { ops: [doc] });
            });
        },
    };
    return { db: { collection: () => members }, docs, state };
}

/**
 * Run a setup and resolve with what its callback reported.
 * @param {number} n - distinguishes the requests
 * @returns {Promise<*>} the callback's error argument (undefined on success)
 */
function runSetup(n) {
    const req = {
        body: { full_name: 'Admin ' + n, username: 'admin' + n, email: 'admin' + n + '@example.com', password: 'S3tup-Passw0rd!' },
        session: {},
    };
    return new Promise((resolve) => membersUtility.setup(req, resolve));
}

describe('frontend members.setup: the first admin is fenced by setup_admin_unique', function() {
    this.timeout(20000);
    let originalDb;
    let originalConfig;
    let originalGetConfig;
    let originalSave;

    beforeEach(function() {
        originalDb = membersUtility.db;
        originalConfig = membersUtility.countlyConfig;
        membersUtility.countlyConfig = { passwordSecret: '' };
        originalGetConfig = plugins.getConfig;
        originalSave = authorize.save;
        plugins.getConfig = () => ({ password_min: 8 });
        authorize.save = (o) => o.callback(null, 'token');
    });

    afterEach(function() {
        plugins.getConfig = originalGetConfig;
        authorize.save = originalSave;
        membersUtility.db = originalDb;
        membersUtility.countlyConfig = originalConfig;
    });

    it('refuses, creating nobody, when the index cannot be confirmed', async function() {
        const { db, state } = fakeDb({ failIndex: true });
        membersUtility.db = db;

        const err = await runSetup(1);

        assert.strictEqual(err, membersUtility.SETUP_UNAVAILABLE);
        assert.strictEqual(state.inserts, 0, 'nothing may be inserted without the fence');
    });

    it('creates exactly one admin when two setups both pass the member count', async function() {
        const { db, docs } = fakeDb();
        membersUtility.db = db;

        const results = await Promise.all([runSetup(1), runSetup(2)]);

        assert.deepStrictEqual(results.map((r) => r === undefined ? 'ok' : r).sort(), ['User exists', 'ok']);
        assert.strictEqual(docs.filter((d) => d.global_admin === true).length, 1);
        assert.strictEqual(docs[0].setup_admin, true);
    });

    it('reports a failed insert as a failure, not as "User exists"', async function() {
        const insertError = new Error('connection reset');
        const { db } = fakeDb({ insertError });
        membersUtility.db = db;

        assert.strictEqual(await runSetup(1), insertError);
    });
});
