require("should");
var authorizer = require("../../api/utils/authorizer.js");

var OWNER = "60e42efa5c23ee7ec6259af0";

/**
* In-memory auth_tokens collection whose reads answer on a later tick, as a database does, so
* requests that arrive together all read before any of them writes. deleteOne is atomic, as it is
* in MongoDB: only one caller removes a given document.
* @param {object[]} tokens - documents the collection starts with
* @returns {object} db stub, with the stored documents on .stored
*/
function dbStub(tokens) {
    var stored = tokens || [];
    /**
    * Remove the token with this _id
    * @param {string} id - token id
    * @returns {number} how many documents were removed
    */
    function removeById(id) {
        var removed = 0;
        for (var i = stored.length - 1; i >= 0; i--) {
            if (stored[i]._id === id) {
                stored.splice(i, 1);
                removed++;
            }
        }
        return removed;
    }
    return {
        stored: stored,
        collection: function() {
            return {
                findOne: function(query, callback) {
                    var found = stored.filter(function(doc) {
                        return doc._id === query._id;
                    })[0];
                    var copy = found ? JSON.parse(JSON.stringify(found)) : null;
                    setImmediate(function() {
                        callback(null, copy);
                    });
                },
                deleteOne: function(query, options, callback) {
                    var removed = removeById(query._id);
                    setImmediate(function() {
                        callback(null, {deletedCount: removed});
                    });
                },
                remove: function(query) {
                    removeById(query._id);
                }
            };
        }
    };
}

/**
* Verify a token the way /login/token and rights.js do
* @param {object} db - db stub
* @param {string} token - token id
* @returns {Promise<any>} what verify_return answered
*/
function redeem(db, token) {
    return new Promise(function(resolve) {
        authorizer.verify_return({
            db: db,
            token: token,
            req_path: "",
            return_data: true,
            callback: function(valid) {
                resolve(valid);
            }
        });
    });
}

/**
* A token document as authorizer.save stores it
* @param {object} fields - fields to override
* @returns {object} token document
*/
function token(fields) {
    return Object.assign({
        _id: "tok",
        ttl: 300,
        ends: Math.round(Date.now() / 1000) + 300,
        multi: false,
        owner: OWNER,
        app: "",
        endpoint: "",
        purpose: "LoginAuthToken",
        can_login: true
    }, fields);
}

describe("authorizer single use tokens", function() {
    it("lets exactly one of several parallel redemptions of a single use token through", async function() {
        var db = dbStub([token()]);
        var results = await Promise.all([1, 2, 3, 4, 5, 6, 7, 8].map(function() {
            return redeem(db, "tok");
        }));
        var granted = results.filter(Boolean);
        granted.length.should.equal(1);
        granted[0].owner.should.equal(OWNER);
        db.stored.length.should.equal(0);
    });

    it("refuses a single use token the second time, one request after the other", async function() {
        var db = dbStub([token()]);
        (await redeem(db, "tok")).owner.should.equal(OWNER);
        (await redeem(db, "tok")).should.equal(false);
    });

    it("keeps a multi token usable by parallel and repeated requests", async function() {
        var db = dbStub([token({multi: true})]);
        var results = await Promise.all([1, 2, 3, 4].map(function() {
            return redeem(db, "tok");
        }));
        results.filter(Boolean).length.should.equal(4);
        (await redeem(db, "tok")).owner.should.equal(OWNER);
        db.stored.length.should.equal(1);
    });

    it("keeps a non-expiring multi token usable", async function() {
        var db = dbStub([token({multi: true, ttl: 0, ends: 0})]);
        (await redeem(db, "tok")).owner.should.equal(OWNER);
        (await redeem(db, "tok")).owner.should.equal(OWNER);
    });

    it("refuses and removes an expired multi token", async function() {
        var db = dbStub([token({multi: true, ends: Math.round(Date.now() / 1000) - 10})]);
        (await redeem(db, "tok")).should.equal(false);
        db.stored.length.should.equal(0);
    });

    it("refuses and removes an expired single use token", async function() {
        var db = dbStub([token({ends: Math.round(Date.now() / 1000) - 10})]);
        (await redeem(db, "tok")).should.equal(false);
        db.stored.length.should.equal(0);
    });

    it("answers with the owner for return_owner callers, once", async function() {
        var db = dbStub([token()]);
        var owners = await Promise.all([1, 2].map(function() {
            return new Promise(function(resolve) {
                authorizer.verify_return({
                    db: db,
                    token: "tok",
                    req_path: "",
                    callback: resolve
                });
            });
        }));
        owners.filter(Boolean).should.eql([OWNER]);
    });
});
