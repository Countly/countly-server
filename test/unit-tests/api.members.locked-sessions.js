require("should");
var common = require("../../api/utils/common.js");
var plugins = require("../../plugins/pluginManager.js");
var authorize = require("../../api/utils/authorizer.js");
var usersApi = require("../../api/parts/mgmt/users.js");
var membersUtility = require("../../frontend/express/libs/members.js");

// A locked member keeps no way into the dashboard: saving the lock ends their
// sessions, and a login token of theirs is not redeemed. The admin saving the
// change keeps their own session.

var ADMIN_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
var MEMBER_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";

/**
* Run usersApi.updateUser against a stubbed database
* @param {string} actorId - id of the admin saving the change
* @param {object} args - the update args
* @param {object} before - extra fields of the member as stored before the change
* @returns {Promise<object>} the sessions and tokens the update removed, and the response status
**/
function update(actorId, args, before) {
    var captured = {sessionQueries: [], removedSessions: [], removedTokens: [], status: null};
    var sessions = [
        {_id: "s-member", session: JSON.stringify({uid: MEMBER_ID})},
        {_id: "s-admin", session: JSON.stringify({uid: ADMIN_ID})}
    ];

    var reads = 0;
    var realDb = common.db;
    var realMessage = common.returnMessage;
    var realDispatch = plugins.dispatch;

    return new Promise(function(resolve, reject) {
        common.db = {
            ObjectID: function(id) {
                return id;
            },
            collection: function(name) {
                return {
                    findOne: function(query, callback) {
                        // the first read is the member before the change
                        var stored = {_id: query._id, username: "member"};
                        if (reads++ === 0) {
                            Object.assign(stored, before || {});
                        }
                        callback(null, stored);
                    },
                    deleteMany: function(query) {
                        if (name === "auth_tokens") {
                            captured.removedTokens.push(query);
                        }
                        return Promise.resolve({deletedCount: 0});
                    },
                    update: function(query, update, options, callback) {
                        callback(null);
                    },
                    find: function(query) {
                        captured.sessionQueries.push(query);
                        return {
                            toArray: function(callback) {
                                callback(null, sessions);
                            }
                        };
                    },
                    remove: function(query) {
                        if (name === "sessions_") {
                            captured.removedSessions = captured.removedSessions.concat(query._id.$in);
                        }
                        else if (name === "auth_tokens") {
                            captured.removedTokens.push(query);
                        }
                        var callback = arguments[arguments.length - 1];
                        if (typeof callback === "function") {
                            callback(null);
                        }
                    }
                };
            }
        };
        plugins.dispatch = function(event, ob, callback) {
            if (typeof callback === "function") {
                callback();
            }
        };
        common.returnMessage = function(params, status) {
            captured.status = status;
            common.db = realDb;
            common.returnMessage = realMessage;
            plugins.dispatch = realDispatch;
            resolve(captured);
        };

        usersApi.updateUser({
            member: {_id: actorId, global_admin: true},
            qstring: {args: Object.assign({user_id: MEMBER_ID}, args)}
        }).catch(function(err) {
            common.db = realDb;
            common.returnMessage = realMessage;
            plugins.dispatch = realDispatch;
            reject(err);
        });
    });
}

describe("locking a member", function() {
    it("ends the locked member's dashboard sessions and revokes their tokens, once", async function() {
        var result = await update(ADMIN_ID, {locked: true});
        result.status.should.equal(200);
        result.sessionQueries.should.have.length(1);
        result.removedSessions.should.eql(["s-member"]);
        result.removedTokens.should.eql([{owner: MEMBER_ID}]);
    });

    it("keeps the session of the admin saving the change", async function() {
        var result = await update(ADMIN_ID, {locked: true});
        result.removedSessions.should.not.containEql("s-admin");
    });

    it("leaves sessions alone when the member is saved unlocked", async function() {
        var result = await update(ADMIN_ID, {locked: false, full_name: "Renamed"});
        result.status.should.equal(200);
        result.sessionQueries.should.eql([]);
        result.removedSessions.should.eql([]);
    });

    it("does not end the session of an admin who saves their own account locked", async function() {
        var result = await update(MEMBER_ID, {locked: true});
        result.status.should.equal(200);
        result.sessionQueries.should.eql([]);
    });

    it("ends nothing again when a member who is already locked is saved", async function() {
        var result = await update(ADMIN_ID, {locked: true, full_name: "Renamed"}, {locked: true});
        result.status.should.equal(200);
        result.sessionQueries.should.eql([]);
        result.removedTokens.should.eql([]);
    });
});

describe("changing a member's password", function() {
    it("ends the member's sessions when another admin sets it", async function() {
        var result = await update(ADMIN_ID, {password: "N3w-password!"});
        result.status.should.equal(200);
        result.removedSessions.should.eql(["s-member"]);
    });

    it("keeps the sessions of a member who changes their own", async function() {
        var result = await update(MEMBER_ID, {password: "N3w-password!"});
        result.status.should.equal(200);
        result.sessionQueries.should.eql([]);
    });
});

describe("login tokens of a locked member", function() {
    /**
    * Redeem a login token whose owner is the given member
    * @param {object} member - the token owner as stored
    * @returns {object} whether a session was started, and what the callback got
    **/
    function redeem(member) {
        var outcome = {regenerated: false, called: false, result: null};
        var realVerify = authorize.verify_return;
        var realDb = membersUtility.db;
        var realConfig = membersUtility.countlyConfig;
        var realCallMethod = plugins.callMethod;

        authorize.verify_return = function(options) {
            options.callback({owner: member._id, purpose: "LoginAuthToken", can_login: true});
        };
        membersUtility.countlyConfig = {path: ""};
        membersUtility.db = {
            ObjectID: function(id) {
                return id;
            },
            collection: function() {
                return {
                    findOne: function(query, callback) {
                        callback(null, member);
                    }
                };
            }
        };
        plugins.callMethod = function() {};

        var req = {
            params: {token: "t"},
            url: "/login/token/t",
            session: {
                regenerate: function() {
                    // the session is only regenerated for a member who may sign in
                    outcome.regenerated = true;
                }
            }
        };
        try {
            membersUtility.loginWithToken(req, function(result) {
                outcome.called = true;
                outcome.result = result;
            });
        }
        finally {
            authorize.verify_return = realVerify;
            membersUtility.db = realDb;
            membersUtility.countlyConfig = realConfig;
            plugins.callMethod = realCallMethod;
        }
        return outcome;
    }

    it("refuses the token of a locked member", function() {
        var outcome = redeem({_id: MEMBER_ID, username: "member", locked: true});
        outcome.called.should.equal(true);
        (outcome.result === undefined).should.equal(true);
        outcome.regenerated.should.equal(false);
    });

    it("starts a session for the token of an active member", function() {
        var outcome = redeem({_id: MEMBER_ID, username: "member"});
        outcome.regenerated.should.equal(true);
    });
});
