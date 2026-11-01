require("should");
var ObjectId = require("mongodb").ObjectId;
var authorizer = require("../../api/utils/authorizer.js");

// authorizer.save stores a token's owner as a string. Revoking by an ObjectId owner matched
// nothing, so a password reset left every token of the member in place. These tests run the
// shared revocation against an in-memory store that compares values by type, as MongoDB does.

var OWNER = "60e42efa5c23ee7ec6259af0";
var OTHER = "60e42efa5c23ee7ec6259af1";

/**
* Minimal in-memory db: auth_tokens supports deleteMany with owner, purpose and _id {$ne}.
* Values are compared strictly, so an ObjectId never equals its hex string.
* @param {object[]} tokens - auth_tokens documents
* @returns {object} db stub
*/
function dbStub(tokens) {
    /**
    * @param {*} a - stored value
    * @param {*} b - queried value
    * @returns {boolean} equal as MongoDB compares them
    */
    function same(a, b) {
        if (a instanceof ObjectId || b instanceof ObjectId) {
            return a instanceof ObjectId && b instanceof ObjectId && a.equals(b);
        }
        return a === b;
    }
    return {
        tokens: tokens,
        collection: function(name) {
            if (name === "auth_tokens") {
                return {
                    deleteMany: async function(query) {
                        for (var i = tokens.length - 1; i >= 0; i--) {
                            var t = tokens[i];
                            var hit = same(t.owner, query.owner) &&
                                (query.purpose === undefined || t.purpose === query.purpose) &&
                                (!query._id || t._id !== query._id.$ne);
                            if (hit) {
                                tokens.splice(i, 1);
                            }
                        }
                    }
                };
            }
            return {};
        }
    };
}

/**
* @returns {object[]} tokens of two members, of several purposes
*/
function someTokens() {
    return [
        {_id: "login", owner: OWNER, purpose: "LoggedInAuth"},
        {_id: "login2", owner: OWNER, purpose: "LoggedInAuth"},
        {_id: "integration", owner: OWNER, purpose: "Exporter"},
        {_id: "render", owner: OWNER, purpose: "LoginAuthToken"},
        {_id: "other", owner: OTHER, purpose: "LoggedInAuth"}
    ];
}

/**
* @param {object[]} tokens - auth_tokens documents
* @returns {string[]} their ids
*/
function ids(tokens) {
    return tokens.map(function(t) {
        return t._id;
    });
}

describe("authorizer.revokeMemberTokens", function() {
    it("revokes every token the member owns when given an ObjectId owner", async function() {
        var db = dbStub(someTokens());
        await authorizer.revokeMemberTokens({db: db, owner: new ObjectId(OWNER)});
        ids(db.tokens).should.eql(["other"]);
    });

    it("revokes only the given purpose", async function() {
        var db = dbStub(someTokens());
        await authorizer.revokeMemberTokens({db: db, owner: OWNER, purpose: "LoggedInAuth"});
        ids(db.tokens).should.eql(["integration", "render", "other"]);
    });

    it("keeps the current token", async function() {
        var db = dbStub(someTokens());
        await authorizer.revokeMemberTokens({db: db, owner: OWNER, keepToken: "login2"});
        ids(db.tokens).should.eql(["login2", "other"]);
    });
});
