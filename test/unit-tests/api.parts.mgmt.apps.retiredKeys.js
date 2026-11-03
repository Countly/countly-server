var should = require("should");
var common = require("../../api/utils/common.js");
var plugins = require("../../plugins/pluginManager.js");

/**
 * A key an app retired stays reserved: it is recorded on the app, and no other
 * app may take it, so SDK clients still sending it are refused instead of being
 * attributed to whichever app took the key over. Only keys the app accepted are
 * recorded, and the app itself may take its own retired key back.
 */
describe("apps update: retired keys stay reserved", function() {
    var appsApi;
    var saved = {};
    var APP_A = "5f0c0d0e0f1a2b3c4d5e6f81";
    var APP_B = "5f0c0d0e0f1a2b3c4d5e6f82";
    var K0 = "reservedkey00000000000000000000000000000a";
    var K1 = "reservedkey00000000000000000000000000000b";
    var KB = "reservedkey00000000000000000000000000000c";
    var stored;

    /**
     * Whether a stored app matches a filter of the shapes updateApp and checkUniqueKey use.
     * @param {object} doc - stored app
     * @param {object} query - filter
     * @returns {boolean} true on a match
     */
    function matches(doc, query) {
        var keys = (doc.keys || []).map(function(k) {
            return k.key;
        });
        return Object.keys(query).every(function(field) {
            var cond = query[field];
            if (field === "$or") {
                return cond.some(function(sub) {
                    return matches(doc, sub);
                });
            }
            if (field === "_id") {
                return cond && cond.$ne ? doc._id !== cond.$ne : doc._id === cond;
            }
            if (field === "keys.0") {
                return !keys.length;
            }
            if (field === "keys.key") {
                return typeof cond === "object" ? keys.indexOf(cond.$ne) === -1 : keys.indexOf(cond) !== -1;
            }
            if (field === "retired_keys") {
                return (doc.retired_keys || []).indexOf(cond) !== -1;
            }
            return doc[field] === cond;
        });
    }

    /**
     * Apply an update document to a stored app, the way MongoDB would.
     * @param {object} doc - stored app
     * @param {object} update - update document
     */
    function apply(doc, update) {
        Object.keys(update.$set || {}).forEach(function(f) {
            doc[f] = JSON.parse(JSON.stringify(update.$set[f]));
        });
        Object.keys(update.$unset || {}).forEach(function(f) {
            delete doc[f];
        });
        if (update.$pull && update.$pull.keys) {
            var cond = update.$pull.keys.key;
            doc.keys = doc.keys.filter(function(k) {
                return !(cond.$in.indexOf(k.key) !== -1 && k.key !== cond.$ne);
            });
        }
        if (update.$push && update.$push.keys) {
            doc.keys.push(update.$push.keys);
        }
        if (update.$addToSet && update.$addToSet.retired_keys) {
            doc.retired_keys = doc.retired_keys || [];
            update.$addToSet.retired_keys.$each.forEach(function(k) {
                if (doc.retired_keys.indexOf(k) === -1) {
                    doc.retired_keys.push(k);
                }
            });
        }
    }

    /**
     * First stored app matching a filter.
     * @param {object} query - filter, or a bare _id
     * @returns {object|null} a copy of the app
     */
    function find(query) {
        if (typeof query === "string") {
            query = {_id: query};
        }
        var doc = stored.filter(function(d) {
            return matches(d, query);
        })[0];
        return doc ? JSON.parse(JSON.stringify(doc)) : null;
    }

    var apps = {
        findOne: function(query, opts, fn) {
            var cb = typeof opts === "function" ? opts : fn;
            var doc = find(query);
            if (cb) {
                setImmediate(function() {
                    cb(null, doc);
                });
            }
            return Promise.resolve(doc);
        },
        updateOne: function(query, update) {
            stored.filter(function(d) {
                return matches(d, query);
            }).slice(0, 1).forEach(function(d) {
                apply(d, update);
            });
            return Promise.resolve({});
        },
        ensureIndex: function() {}
    };

    /**
     * Call updateApp and resolve with what it answered.
     * @param {object} args - update args, with app_id
     * @returns {Promise<object>} {output} or {status, message}
     */
    function update(args) {
        return new Promise(function(resolve) {
            var params = {qstring: {args: args}, member: {global_admin: true}, res: {}};
            params.__resolve = resolve;
            appsApi.updateApp(params);
        });
    }

    before(function() {
        saved.db = common.db;
        saved.returnMessage = common.returnMessage;
        saved.returnOutput = common.returnOutput;
        saved.readBatcher = common.readBatcher;
        saved.dispatch = plugins.dispatch;
        common.db = {
            collection: function() {
                return apps;
            },
            ObjectID: function(id) {
                return id;
            }
        };
        common.returnMessage = function(params, status, message) {
            params.__resolve({status: status, message: message});
        };
        common.returnOutput = function(params, output) {
            params.__resolve({output: output});
        };
        common.readBatcher = {invalidate: function() {}};
        plugins.dispatch = function() {};
        appsApi = require("../../api/parts/mgmt/apps.js");
    });

    after(function() {
        common.db = saved.db;
        common.returnMessage = saved.returnMessage;
        common.returnOutput = saved.returnOutput;
        common.readBatcher = saved.readBatcher;
        plugins.dispatch = saved.dispatch;
    });

    beforeEach(function() {
        stored = [
            {_id: APP_A, name: "a", key: K1, id_key: K0, keys: [{key: K0, added_at: 1, last_data: 0}, {key: K1, added_at: 2, last_data: 0}]},
            {_id: APP_B, name: "b", key: KB, id_key: KB, keys: [{key: KB, added_at: 1, last_data: 0}]}
        ];
    });

    it("refuses another app the key an app retired", async function() {
        should.exist((await update({app_id: APP_A, remove_keys: [K0]})).output);
        var r = await update({app_id: APP_B, key: K0});
        r.should.eql({status: 400, message: "App key already in use"});
        find(APP_B).key.should.equal(KB);
    });

    it("records the retired key on the app, and no longer accepts it", async function() {
        await update({app_id: APP_A, remove_keys: [K0]});
        var a = find(APP_A);
        a.retired_keys.should.eql([K0]);
        a.keys.map(function(k) {
            return k.key;
        }).should.eql([K1]);
        should.not.exist(find({"keys.key": K0}));
    });

    it("records only keys the app accepted", async function() {
        await update({app_id: APP_A, remove_keys: [K0, KB, "never-a-key-of-this-app"]});
        find(APP_A).retired_keys.should.eql([K0]);
        find(APP_B).keys.map(function(k) {
            return k.key;
        }).should.eql([KB]);
    });

    it("lets the app take its own retired key back", async function() {
        await update({app_id: APP_A, remove_keys: [K0]});
        should.exist((await update({app_id: APP_A, key: K0})).output);
        find(APP_A).key.should.equal(K0);
    });
});
