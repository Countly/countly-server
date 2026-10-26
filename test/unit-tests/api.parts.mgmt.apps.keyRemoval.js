var should = require("should");
var common = require("../../api/utils/common.js");
var plugins = require("../../plugins/pluginManager.js");

/**
 * Retiring app keys changes the stored accepted-keys array in place: two
 * updates that read the app at the same time and each retire a different key
 * must both take effect, the current key always stays, a failed write never
 * answers success, and a retired key is dropped from the app-by-key cache.
 */
describe("apps update: retiring accepted keys", function() {
    var appsApi;
    var saved = {};
    var APP_ID = "5f0c0d0e0f1a2b3c4d5e6f71";
    var K0 = "retirekey000000000000000000000000000000a";
    var K1 = "retirekey000000000000000000000000000000b";
    var K2 = "retirekey000000000000000000000000000000c";
    var K3 = "retirekey000000000000000000000000000000d";
    var app;
    var failWrites;
    var invalidated;
    var holdPushOf;
    var releasePush;

    /**
     * Whether a stored app matches the filters updateApp writes with.
     * @param {object} query - filter
     * @returns {boolean} true on a match
     */
    function matches(query) {
        var keys = (app.keys || []).map(function(k) {
            return k.key;
        });
        if (query._id && query._id !== app._id) {
            return false;
        }
        if (query.key && query.key !== app.key) {
            return false;
        }
        if (query["keys.0"] && keys.length) {
            return false;
        }
        if (query["keys.key"] && keys.indexOf(query["keys.key"].$ne) !== -1) {
            return false;
        }
        return true;
    }

    /**
     * Apply an update document to the stored app, the way MongoDB would.
     * @param {object} update - update document
     */
    function apply(update) {
        Object.keys(update.$set || {}).forEach(function(f) {
            app[f] = JSON.parse(JSON.stringify(update.$set[f]));
        });
        Object.keys(update.$unset || {}).forEach(function(f) {
            delete app[f];
        });
        if (update.$pull && update.$pull.keys) {
            var cond = update.$pull.keys.key;
            app.keys = app.keys.filter(function(k) {
                return !(cond.$in.indexOf(k.key) !== -1 && k.key !== cond.$ne);
            });
        }
        if (update.$push && update.$push.keys) {
            app.keys.push(update.$push.keys);
        }
    }

    /**
     * Run on a later tick, so concurrent requests interleave.
     * @param {function} fn - work
     * @returns {Promise} result of fn
     */
    function later(fn) {
        return new Promise(function(resolve, reject) {
            setImmediate(function() {
                try {
                    resolve(fn());
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }

    var apps = {
        findOne: function(query, opts, fn) {
            var cb = typeof opts === "function" ? opts : fn;
            var p = later(function() {
                if (query.$or) {
                    return null;
                }
                return JSON.parse(JSON.stringify(app));
            });
            if (cb) {
                p.then(function(doc) {
                    cb(null, doc);
                });
            }
            return p;
        },
        updateOne: function(query, update) {
            if (holdPushOf && update.$push && update.$push.keys.key === holdPushOf) {
                holdPushOf = null;
                return new Promise(function(resolve) {
                    releasePush = resolve;
                }).then(function() {
                    return apps.updateOne(query, update);
                });
            }
            return later(function() {
                if (failWrites) {
                    throw new Error("write failed");
                }
                if (matches(query)) {
                    apply(update);
                    return {matchedCount: 1};
                }
                return {matchedCount: 0};
            });
        },
        update: function(query, update, opts, fn) {
            var cb = typeof opts === "function" ? opts : fn;
            return apps.updateOne(query, update).then(function(r) {
                if (cb) {
                    cb(null, r);
                }
            }, function(e) {
                if (cb) {
                    cb(e);
                }
            });
        },
        ensureIndex: function() {}
    };

    /**
     * Call updateApp and resolve with what it answered.
     * @param {object} args - update args
     * @returns {Promise<object>} {output} or {status, message}
     */
    function update(args) {
        return new Promise(function(resolve) {
            var params = {
                qstring: {args: Object.assign({app_id: APP_ID}, args)},
                member: {global_admin: true},
                res: {}
            };
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
        common.readBatcher = {
            invalidate: function(collection, query) {
                invalidated.push(JSON.stringify(query));
            }
        };
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
        failWrites = false;
        invalidated = [];
        holdPushOf = null;
        releasePush = null;
        app = {
            _id: APP_ID,
            name: "app",
            key: K2,
            id_key: K0,
            keys: [{key: K0, added_at: 1, last_data: 0}, {key: K1, added_at: 2, last_data: 0}, {key: K2, added_at: 3, last_data: 0}]
        };
    });

    it("keeps both removals when two retirements run at the same time", async function() {
        var results = await Promise.all([update({remove_keys: [K0]}), update({remove_keys: [K1]})]);
        results.forEach(function(r) {
            should.exist(r.output);
        });
        app.keys.map(function(k) {
            return k.key;
        }).should.eql([K2]);
        app.key.should.equal(K2);
    });

    it("answers with the keys as stored after the update", async function() {
        var r = await update({remove_keys: [K0]});
        r.output.keys.map(function(k) {
            return k.key;
        }).should.eql([K1, K2]);
    });

    it("never removes the current key", async function() {
        await update({remove_keys: [K2, K0]});
        app.keys.map(function(k) {
            return k.key;
        }).should.eql([K1, K2]);
    });

    it("adds a rotated key once and removes the requested ones in the same update", async function() {
        var results = await Promise.all([update({key: K3, remove_keys: [K0]}), update({remove_keys: [K1]})]);
        results.forEach(function(r) {
            should.exist(r.output);
        });
        app.key.should.equal(K3);
        app.keys.map(function(k) {
            return k.key;
        }).should.eql([K2, K3]);
    });

    it("does not add back a rotated key that a later rotation retired", async function() {
        holdPushOf = K3;
        var first = update({key: K3});
        while (app.key !== K3) {
            await later(function() {});
        }
        var K4 = "retirekey000000000000000000000000000000e";
        var second = await update({key: K4, remove_keys: [K3]});
        should.exist(second.output);
        releasePush();
        should.exist((await first).output);
        app.key.should.equal(K4);
        app.keys.map(function(k) {
            return k.key;
        }).should.eql([K0, K1, K2, K4]);
    });

    it("materializes the keys of an app that predates them, then removes nothing else", async function() {
        delete app.keys;
        app.key = K0;
        await update({name: "renamed"});
        app.keys.map(function(k) {
            return k.key;
        }).should.eql([K0]);
        app.name.should.equal("renamed");
    });

    it("drops every retired key from the app-by-key cache", async function() {
        await update({remove_keys: [K0, K1]});
        invalidated.should.containEql(JSON.stringify({"keys.key": K0}));
        invalidated.should.containEql(JSON.stringify({"key": K0}));
        invalidated.should.containEql(JSON.stringify({"keys.key": K1}));
        invalidated.should.containEql(JSON.stringify({"key": K1}));
        invalidated.should.not.containEql(JSON.stringify({"keys.key": K2}));
    });

    it("answers an error, not success, when the write fails", async function() {
        failWrites = true;
        var r = await update({remove_keys: [K0]});
        should.not.exist(r.output);
        r.status.should.equal(500);
        invalidated.should.eql([]);
    });
});
