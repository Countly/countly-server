/**
 * The dashboard's first-run setup (frontend/express/libs/members.js `setup`,
 * behind POST /setup) creates the first global admin only while the
 * `setup_admin_unique` index is confirmed, and that index lets only one
 * setup-created admin exist when two setups both pass the member count.
 */
var assert = require("assert");

var plugins = require("../../plugins/pluginManager.js");
var authorize = require("../../api/utils/authorizer.js");
var membersUtility = require("../../frontend/express/libs/members.js");

/**
 * A members collection whose count always reads 0 (as for requests that all
 * passed the count before any insert) and whose insert enforces the unique
 * partial index once createIndex has built it.
 * @param {object} [opts] - behaviour switches
 * @param {boolean} [opts.failIndex] - createIndex rejects
 * @param {Error} [opts.insertError] - insert fails with this error
 * @returns {object} {db, docs, state}
 */
function fakeDb(opts) {
    opts = opts || {};
    var docs = [];
    var state = { indexBuilt: false, inserts: 0 };
    var members = {
        count: function(cb) {
            setImmediate(function() {
                cb(null, 0);
            });
        },
        createIndex: function(keys, options) {
            if (opts.failIndex) {
                return Promise.reject(new Error("not authorized to create index"));
            }
            assert.strictEqual(options.name, "setup_admin_unique");
            assert.strictEqual(options.unique, true);
            state.indexBuilt = true;
            return Promise.resolve(options.name);
        },
        insert: function(doc, options, cb) {
            state.inserts++;
            setImmediate(function() {
                if (opts.insertError) {
                    return cb(opts.insertError);
                }
                if (state.indexBuilt && doc.setup_admin === true && docs.some(function(d) {
                    return d.setup_admin === true;
                })) {
                    return cb(Object.assign(new Error("E11000 duplicate key error"), { code: 11000 }));
                }
                doc._id = "m" + docs.length;
                docs.push(doc);
                cb(null, { ops: [doc] });
            });
        }
    };
    return {
        db: {
            collection: function() {
                return members;
            }
        },
        docs: docs,
        state: state
    };
}

/**
 * Run a setup and resolve with what its callback reported.
 * @param {number} n - distinguishes the requests
 * @returns {Promise<*>} the callback's error argument (undefined on success)
 */
function runSetup(n) {
    var req = {
        body: { full_name: "Admin " + n, username: "admin" + n, email: "admin" + n + "@example.com", password: "S3tup-Passw0rd!" },
        session: {}
    };
    return new Promise(function(resolve) {
        membersUtility.setup(req, resolve);
    });
}

describe("frontend members.setup: the first admin is fenced by setup_admin_unique", function() {
    this.timeout(20000);
    var originalDb, originalConfig, originalGetConfig, originalSave;

    beforeEach(function() {
        originalDb = membersUtility.db;
        originalConfig = membersUtility.countlyConfig;
        originalGetConfig = plugins.getConfig;
        originalSave = authorize.save;
        membersUtility.countlyConfig = { passwordSecret: "" };
        plugins.getConfig = function() {
            return { password_min: 8 };
        };
        authorize.save = function(o) {
            o.callback(null, "token");
        };
    });

    afterEach(function() {
        membersUtility.db = originalDb;
        membersUtility.countlyConfig = originalConfig;
        plugins.getConfig = originalGetConfig;
        authorize.save = originalSave;
    });

    it("refuses, creating nobody, when the index cannot be confirmed", async function() {
        var fake = fakeDb({ failIndex: true });
        membersUtility.db = fake.db;

        var err = await runSetup(1);

        assert.strictEqual(err, membersUtility.SETUP_UNAVAILABLE);
        assert.strictEqual(fake.state.inserts, 0, "nothing may be inserted without the index");
    });

    it("creates exactly one admin when two setups both pass the member count", async function() {
        var fake = fakeDb();
        membersUtility.db = fake.db;

        var results = await Promise.all([runSetup(1), runSetup(2)]);

        assert.deepStrictEqual(results.map(function(r) {
            return r === undefined ? "ok" : r;
        }).sort(), ["User exists", "ok"]);
        assert.strictEqual(fake.docs.filter(function(d) {
            return d.global_admin === true;
        }).length, 1);
        assert.strictEqual(fake.docs[0].setup_admin, true);
    });

    it("reports a failed insert as a failure, not as \"User exists\"", async function() {
        var insertError = new Error("connection reset");
        var fake = fakeDb({ insertError: insertError });
        membersUtility.db = fake.db;

        assert.strictEqual(await runSetup(1), insertError);
    });
});
