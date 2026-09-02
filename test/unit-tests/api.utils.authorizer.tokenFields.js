require("should");
var authorizer = require("../../api/utils/authorizer.js");

var OWNER = "60e42efa5c23ee7ec6259af0";

/**
* Minimal in-memory stand-in for the countly db handle, so the token record can be exercised
* without a running MongoDB.
* @param {object[]} tokens - documents the auth_tokens collection starts with
* @returns {object} db stub, with the stored documents on .stored
*/
function dbStub(tokens) {
    var stored = tokens || [];
    return {
        stored: stored,
        ObjectID: function(id) {
            return id;
        },
        collection: function(name) {
            return {
                findOne: function(query, projectionOrCallback, maybeCallback) {
                    var callback = typeof projectionOrCallback === "function" ? projectionOrCallback : maybeCallback;
                    if (name === "members") {
                        return callback(null, {_id: OWNER});
                    }
                    var found = stored.filter(function(doc) {
                        return doc._id === query._id;
                    })[0];
                    callback(null, found || null);
                },
                insert: function(doc, callback) {
                    stored.push(doc);
                    callback(null, doc);
                },
                remove: function() { },
                update: function(query, change, callback) {
                    stored.filter(function(doc) {
                        return doc._id === query._id;
                    }).forEach(function(doc) {
                        Object.assign(doc, (change && change.$set) || {});
                    });
                    if (typeof callback === "function") {
                        callback(null, {});
                    }
                },
                findAndModify: function(rules, sort, update, callback) {
                    callback(null, null);
                }
            };
        }
    };
}

describe("authorizer token record", function() {
    it("stores can_login and token_permission when they are asked for", function(done) {
        var db = dbStub([]);
        var permission = {_: {a: [], u: [["app1"]]}, c: {}, r: {app1: {all: false, allowed: {core: true}}}, u: {}, d: {}};
        authorizer.save({
            db: db,
            owner: OWNER,
            ttl: 300,
            token_permission: permission,
            can_login: true,
            callback: function(err) {
                (!err).should.equal(true);
                db.stored.length.should.equal(1);
                db.stored[0].can_login.should.equal(true);
                db.stored[0].token_permission.should.eql(permission);
                done();
            }
        });
    });

    it("defaults to no login permission and no permission scope", function(done) {
        var db = dbStub([]);
        authorizer.save({
            db: db,
            owner: OWNER,
            ttl: 300,
            callback: function() {
                //login permission is never acquired by omission
                db.stored[0].can_login.should.equal(false);
                db.stored[0].should.not.have.property("token_permission");
                done();
            }
        });
    });

    it("never treats a truthy non-true value as login permission", function(done) {
        var db = dbStub([]);
        authorizer.save({
            db: db,
            owner: OWNER,
            ttl: 300,
            can_login: "yes",
            callback: function() {
                db.stored[0].can_login.should.equal(false);
                done();
            }
        });
    });

    it("never lets ends pass an absolute bound, whatever ttl was asked for", function(done) {
        //a scoped token minting a child hands over its own ends as the bound. The bound is applied
        //here, at insertion, because the member lookup before it is asynchronous: a relative ttl
        //computed by the caller would land ends later than the bound by the lookup's duration
        var db = dbStub([]);
        var now = Math.round(Date.now() / 1000);
        var bound = now + 60;
        authorizer.save({
            db: db,
            owner: OWNER,
            ttl: 3600,
            maxEnds: bound,
            callback: function(err) {
                (!err).should.equal(true);
                db.stored[0].ends.should.be.belowOrEqual(bound);
                db.stored[0].ends.should.be.above(now);
                //the ttl asked for is kept as a record of the request; ends is what verify_token checks
                db.stored[0].ttl.should.equal(3600);
                done();
            }
        });
    });

    it("leaves ends alone when no bound is given, and for a token that never expires", function(done) {
        var db = dbStub([]);
        var now = Math.round(Date.now() / 1000);
        authorizer.save({
            db: db,
            owner: OWNER,
            ttl: 3600,
            callback: function() {
                db.stored[0].ends.should.be.aboveOrEqual(now + 3600);
                authorizer.save({
                    db: db,
                    owner: OWNER,
                    ttl: 0,
                    maxEnds: now + 60,
                    callback: function() {
                        //ttl 0 is "never expires" and verify_token never reads ends for it; the
                        //bound is not silently turned into an expiry the caller did not ask for
                        db.stored[1].ttl.should.equal(0);
                        done();
                    }
                });
            }
        });
    });

    describe("extend_token", function() {
        it("never extends a bounded token past its bound", function(done) {
            //the heatmap route extends a near-expiry token by ten minutes on every request. For a
            //child bounded by its parent that would keep it alive indefinitely after the parent
            //expired, so the bound is persisted and the extension clamps to it
            var db = dbStub([]);
            var now = Math.round(Date.now() / 1000);
            var bound = now + 60;
            authorizer.save({
                db: db,
                owner: OWNER,
                ttl: 30,
                maxEnds: bound,
                token: "bounded",
                callback: function() {
                    db.stored[0].max_ends.should.equal(bound);
                    authorizer.extend_token({
                        db: db,
                        token: "bounded",
                        extendTill: Date.now() + 600000,
                        callback: function(err, ok) {
                            (!err).should.equal(true);
                            ok.should.equal(true);
                            db.stored[0].ends.should.equal(bound);
                            db.stored[0].ttl.should.be.above(0);
                            //the relative form is clamped the same way
                            authorizer.extend_token({
                                db: db,
                                token: "bounded",
                                extendBy: 600000,
                                callback: function(err2, ok2) {
                                    (!err2).should.equal(true);
                                    ok2.should.equal(true);
                                    db.stored[0].ends.should.equal(bound);
                                    db.stored[0].ttl.should.be.above(0);
                                    done();
                                }
                            });
                        }
                    });
                }
            });
        });

        it("fails closed when the bound cannot be read", function(done) {
            //a transient read failure must not turn into an unbounded ten-minute extension
            var db = dbStub([{
                _id: "bounded",
                ttl: 30,
                ends: 1,
                max_ends: 1,
                multi: true
            }]);
            var findOne = db.collection("auth_tokens").findOne;
            db.collection = function(name) {
                var coll = dbStub(db.stored).collection(name);
                if (name === "auth_tokens") {
                    coll.findOne = function(query, projection, callback) {
                        (callback || projection)(new Error("read failed"), null);
                    };
                }
                return coll;
            };
            void findOne;
            authorizer.extend_token({
                db: db,
                token: "bounded",
                extendTill: Date.now() + 600000,
                callback: function(err, ok) {
                    (!!err).should.equal(true);
                    (ok === null).should.equal(true);
                    //nothing was written
                    db.stored[0].ends.should.equal(1);
                    done();
                }
            });
        });

        it("extends an unbounded token exactly as before", function(done) {
            var db = dbStub([]);
            authorizer.save({
                db: db,
                owner: OWNER,
                ttl: 30,
                token: "free",
                callback: function() {
                    (db.stored[0].max_ends === undefined).should.equal(true);
                    var till = Date.now() + 600000;
                    authorizer.extend_token({
                        db: db,
                        token: "free",
                        extendTill: till,
                        callback: function() {
                            db.stored[0].ends.should.equal(Math.round(till / 1000));
                            done();
                        }
                    });
                }
            });
        });
    });

    describe("the bound is enforced at every use", function() {
        var now = Math.round(Date.now() / 1000);

        /**
        * A stored token document with the given lifetime fields.
        * @param {string} id - token id
        * @param {object} life - ttl, ends and max_ends
        * @returns {object} document for the stub
        */
        function tokenDoc(id, life) {
            return {
                _id: id,
                owner: OWNER,
                ttl: life.ttl,
                ends: life.ends,
                max_ends: life.max_ends,
                multi: true,
                app: "",
                endpoint: ""
            };
        }

        /**
        * Verify a token through the public entry point, handing back the document or false.
        * @param {object} db - stub
        * @param {string} id - token id
        * @param {function} cb - called with the verify result
        * @returns {void}
        */
        function verify(db, id, cb) {
            authorizer.verify_return({
                db: db,
                token: id,
                req_path: "",
                return_data: true,
                callback: cb
            });
        }

        it("refuses a token whose bound has passed, however far its ends was pushed", function(done) {
            //whatever moved ends - the session-timeout retiming of every LoggedInAuth token of a
            //member writes ends directly - the parent's bound is the end of this token's life
            var db = dbStub([tokenDoc("pushed", {ttl: 3600, ends: now + 3600, max_ends: now - 5})]);
            verify(db, "pushed", function(valid) {
                (!valid).should.equal(true);
                done();
            });
        });

        it("refuses a never-expiring token once its bound has passed", function(done) {
            var db = dbStub([tokenDoc("forever", {ttl: 0, ends: 0, max_ends: now - 5})]);
            verify(db, "forever", function(valid) {
                (!valid).should.equal(true);
                done();
            });
        });

        it("accepts a bounded token while its bound is ahead", function(done) {
            var db = dbStub([tokenDoc("alive", {ttl: 3600, ends: now + 3600, max_ends: now + 60})]);
            verify(db, "alive", function(valid) {
                valid._id.should.equal("alive");
                done();
            });
        });

        it("keeps session-timeout retiming away from bounded tokens", function() {
            //plugins/plugins rewrites ttl and ends of every LoggedInAuth token a member owns when the
            //session timeout changes. A bounded child is not a session token, whatever purpose it was
            //given, so both updates leave bounded tokens alone
            var src = require("fs").readFileSync(require("path").join(__dirname, "../../plugins/plugins/api/api.js"), "utf8");
            var updates = src.match(/collection\("auth_tokens"\)\.update\(\{[^\n]*"purpose": "LoggedInAuth"[^\n]*\}/g) || [];
            updates.length.should.equal(2);
            updates.forEach(function(call) {
                call.should.match(/"max_ends": \{\$exists: false\}/);
            });
        });
    });

    describe("verify_token", function() {
        var future = Math.round(Date.now() / 1000) + 3600;

        it("still applies the endpoint regex to a legacy token", function(done) {
            var db = dbStub([{
                _id: "legacy",
                ttl: 300,
                ends: future,
                multi: true,
                owner: OWNER,
                app: "",
                endpoint: ["^/o/users"],
                purpose: "legacy"
            }]);
            authorizer.verify_return({
                db: db,
                token: "legacy",
                req_path: "/o/apps/all",
                return_data: true,
                callback: function(valid) {
                    //path outside the allowed regex is refused, as before
                    (valid === false).should.equal(true);
                    authorizer.verify_return({
                        db: db,
                        token: "legacy",
                        req_path: "/o/users/all",
                        return_data: true,
                        callback: function(valid2) {
                            valid2.should.have.property("_id", "legacy");
                            done();
                        }
                    });
                }
            });
        });

        it("ignores the endpoint regex once a token carries permissions", function(done) {
            //the regex was never an authorization boundary; permissions are enforced in rights.js
            var db = dbStub([{
                _id: "scoped",
                ttl: 300,
                ends: future,
                multi: true,
                owner: OWNER,
                app: "",
                endpoint: ["^/o/users"],
                purpose: "integration",
                token_permission: {_: {a: [], u: [[]]}, c: {}, r: {}, u: {}, d: {}}
            }]);
            authorizer.verify_return({
                db: db,
                token: "scoped",
                req_path: "/o/apps/all",
                return_data: true,
                callback: function(valid) {
                    valid.should.have.property("_id", "scoped");
                    valid.should.have.property("token_permission");
                    done();
                }
            });
        });

        it("still refuses a request for an app the token is not scoped to", function(done) {
            var db = dbStub([{
                _id: "appscoped",
                ttl: 300,
                ends: future,
                multi: true,
                owner: OWNER,
                app: ["app1"],
                endpoint: "",
                purpose: "integration"
            }]);
            authorizer.verify_return({
                db: db,
                token: "appscoped",
                req_path: "/o",
                qstring: {app_id: "app2"},
                return_data: true,
                callback: function(valid) {
                    (valid === false).should.equal(true);
                    done();
                }
            });
        });
    });
});
