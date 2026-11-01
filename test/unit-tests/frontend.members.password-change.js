var should = require("should");
var ObjectId = require("mongodb").ObjectId;
var membersUtility = require("../../frontend/express/libs/members.js");
var plugins = require("../../plugins/pluginManager.js");

// What the dashboard's password reset form (/reset -> membersUtility.reset) and the session
// helper used by sign-out and the user settings password change
// (membersUtility.killOtherSessionsForUser) remove. The in-memory db compares values by
// type, as MongoDB does (an ObjectId never equals its hex string), and its
// findOneAndDelete is atomic.

var UID = "5f0000000000000000000002";
var OTHER = "5f0000000000000000000003";
var PRID = "reset-link";
var REVOKE_ALL = true;

/**
 * In-memory stand-in for the countly db, enough for reset() and killOtherSessionsForUser()
 * @param {object} state - {tokens, links, member, passwordWrites}
 * @returns {object} fake db
 */
function fakeDb(state) {
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
    /**
    * @param {object} doc - stored document
    * @param {object} query - query with plain values or {$ne}
    * @returns {boolean} the document matches
    */
    function matches(doc, query) {
        return Object.keys(query).every(function(key) {
            var q = query[key];
            if (q && typeof q === "object" && !(q instanceof ObjectId) && "$ne" in q) {
                return !same(doc[key], q.$ne);
            }
            return same(doc[key], q);
        });
    }
    /**
    * @param {object[]} list - documents
    * @param {object} query - query
    */
    function removeFrom(list, query) {
        for (var i = list.length - 1; i >= 0; i--) {
            if (matches(list[i], query)) {
                list.splice(i, 1);
            }
        }
    }
    var collections = {
        auth_tokens: {
            remove: function(query, cb) {
                removeFrom(state.tokens, query);
                if (typeof cb === "function") {
                    cb(null);
                }
            },
            deleteMany: async function(query) {
                removeFrom(state.tokens, query);
            }
        },
        password_reset: {
            findOne: function(query, cb) {
                var found = state.links.find(function(l) {
                    return matches(l, query);
                });
                // a read that takes as long as a database round trip, so two
                // submissions of one link both read it before either uses it
                setTimeout(function() {
                    cb(null, found || null);
                }, 100);
            },
            remove: function(query, cb) {
                removeFrom(state.links, query);
                if (typeof cb === "function") {
                    cb(null);
                }
            },
            findOneAndDelete: async function(query) {
                var i = state.links.findIndex(function(l) {
                    return matches(l, query);
                });
                // countly's db wrapper resolves to {value}
                return {value: i === -1 ? null : state.links.splice(i, 1)[0]};
            },
            insertOne: async function(doc) {
                state.links.push(doc);
            }
        },
        members: {
            findAndModify: function(query, sort, update, cb) {
                state.passwordWrites++;
                Object.assign(state.member, update.$set);
                // let another request run in between, as a real write would
                setImmediate(function() {
                    cb(null, {ok: 1, value: state.member});
                });
            },
            updateOne: async function() {}
        },
        sessions_: {
            find: function() {
                return {
                    toArray: function(cb) {
                        cb(null, []);
                    }
                };
            },
            remove: function() {}
        }
    };
    return {
        // the pluginManager wrapper: an ObjectId for a valid id, the raw value otherwise
        ObjectID: function(id) {
            try {
                return new ObjectId(id);
            }
            catch (e) {
                return id;
            }
        },
        collection: function(name) {
            return collections[name];
        }
    };
}

/**
 * @returns {object} a member with tokens of several purposes, as authorizer.save stores them
 */
function freshState() {
    return {
        member: {_id: new ObjectId(UID), password: "old"},
        links: [{prid: PRID, user_id: new ObjectId(UID), timestamp: Math.round(Date.now() / 1000)}],
        passwordWrites: 0,
        tokens: [
            {_id: "current", owner: UID, purpose: "LoggedInAuth"},
            {_id: "other-browser", owner: UID, purpose: "LoggedInAuth"},
            {_id: "integration", owner: UID, purpose: "Integration"},
            {_id: "render", owner: UID, purpose: "LoginAuthToken"},
            {_id: "someone-else", owner: OTHER, purpose: "LoggedInAuth"}
        ]
    };
}

/**
 * @param {object} state - fake db state
 * @returns {string[]} ids of the tokens left
 */
function tokensLeft(state) {
    return state.tokens.map(function(t) {
        return t._id;
    });
}

/**
 * Submit the reset form as the /reset route does
 * @param {string} password - new password
 * @returns {Promise<object>} the member when the password was set, undefined otherwise
 */
function submitReset(password) {
    var req = {body: {password: password, again: password, prid: PRID}};
    return new Promise(function(resolve) {
        membersUtility.reset(req, function(result, member) {
            resolve(member);
        });
    });
}

describe("Dashboard password reset and session revocation", function() {
    var originalDb = membersUtility.db;
    var originalGetConfig = plugins.getConfig;
    var originalCallMethod = plugins.callMethod;
    var state;

    beforeEach(function() {
        plugins.getConfig = function(name) {
            if (name === "security") {
                return {password_min: 8, password_char: true, password_number: true, password_symbol: true, password_rotation: 3};
            }
            return originalGetConfig.apply(plugins, arguments);
        };
        plugins.callMethod = function() {
            return false;
        };
        state = freshState();
        membersUtility.db = fakeDb(state);
    });

    afterEach(function() {
        plugins.getConfig = originalGetConfig;
        plugins.callMethod = originalCallMethod;
        membersUtility.db = originalDb;
    });

    it("a reset removes every token the member owns, of any purpose, and the link", async function() {
        var member = await submitReset("First-p4ssword!");
        should.exist(member);
        state.passwordWrites.should.equal(1);
        tokensLeft(state).should.eql(["someone-else"]);
        state.links.should.have.length(0);
    });

    it("the same link submitted twice at once sets the password once", async function() {
        var results = await Promise.all([submitReset("First-p4ssword!"), submitReset("Second-p4ssword!")]);
        results.filter(Boolean).should.have.length(1);
        state.passwordWrites.should.equal(1);
        state.links.should.have.length(0);
    });

    it("an expired link is refused, changes nothing and is spent", async function() {
        state.links[0].timestamp -= 601;
        should.not.exist(await submitReset("First-p4ssword!"));
        state.passwordWrites.should.equal(0);
        state.member.password.should.equal("old");
        tokensLeft(state).should.have.length(5);
        state.links.should.have.length(0);
    });

    it("a password change keeps the current token and removes the member's others", async function() {
        await membersUtility.killOtherSessionsForUser(UID, "current", "sid", membersUtility.db, REVOKE_ALL);
        tokensLeft(state).should.eql(["current", "someone-else"]);
    });

    it("sign-out removes the member's dashboard login tokens and keeps their other tokens", async function() {
        await membersUtility.killOtherSessionsForUser(UID, null, null, membersUtility.db);
        tokensLeft(state).should.eql(["integration", "render", "someone-else"]);
    });
});
