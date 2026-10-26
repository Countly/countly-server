var should = require("should");
var membersUtility = require("../../frontend/express/libs/members.js");
var plugins = require("../../plugins/pluginManager.js");

// The dashboard reset form (/reset -> membersUtility.reset) read the reset link, set the
// password and only then removed the link, so two submissions of one link could both set a
// password. It now takes the link first (findOneAndDelete), so one
// link sets the password once. These tests drive reset() against an in-memory db whose
// findOneAndDelete is atomic, as MongoDB's is.

var UID = "5f0000000000000000000002";
var PRID = "reset-link";

/**
 * In-memory stand-in for the countly db, enough for reset()
 * @param {object[]} links - password_reset documents
 * @param {object} member - the member the links belong to
 * @param {object} calls - counters of password writes
 * @returns {object} fake db
 */
function fakeDb(links, member, calls) {
    var collections = {
        password_reset: {
            findOneAndDelete: async function(query) {
                var i = links.findIndex(function(l) {
                    return l.prid === query.prid;
                });
                // countly's db wrapper resolves to {value}
                return {value: i === -1 ? null : links.splice(i, 1)[0]};
            },
            insertOne: async function(doc) {
                links.push(doc);
            }
        },
        members: {
            findAndModify: function(query, sort, update, cb) {
                calls.passwordWrites++;
                Object.assign(member, update.$set);
                // let the other submission run in between, as a real write would
                setImmediate(function() {
                    cb(null, {ok: 1, value: member});
                });
            }
        }
    };
    var other = {
        find: function() {
            return {
                toArray: function(cb) {
                    cb(null, []);
                }
            };
        },
        remove: function() {},
        deleteMany: async function() {},
        updateOne: async function() {}
    };
    return {
        ObjectID: function(id) {
            return id + "";
        },
        collection: function(name) {
            return collections[name] || other;
        }
    };
}

/**
 * Submit the reset form as the /reset route does
 * @param {string} password - new password
 * @returns {Promise<object>} the member when the password was set, undefined otherwise
 */
function submit(password) {
    var req = {body: {password: password, again: password, prid: PRID}};
    return new Promise(function(resolve) {
        membersUtility.reset(req, function(result, member) {
            resolve(member);
        });
    });
}

describe("Dashboard password reset link", function() {
    var originalDb = membersUtility.db;
    var originalGetConfig = plugins.getConfig;
    var originalCallMethod = plugins.callMethod;

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
    });

    afterEach(function() {
        plugins.getConfig = originalGetConfig;
        plugins.callMethod = originalCallMethod;
        membersUtility.db = originalDb;
    });

    it("sets the password once when the same link is submitted twice at once", async function() {
        var member = {_id: UID, password: "old"};
        var links = [{prid: PRID, user_id: UID, timestamp: Math.round(Date.now() / 1000)}];
        var calls = {passwordWrites: 0};
        membersUtility.db = fakeDb(links, member, calls);

        var results = await Promise.all([submit("First-p4ssword!"), submit("Second-p4ssword!")]);

        results.filter(Boolean).should.have.length(1);
        calls.passwordWrites.should.equal(1);
        links.should.have.length(0);
    });

    it("refuses an expired link and leaves it used", async function() {
        var member = {_id: UID, password: "old"};
        var links = [{prid: PRID, user_id: UID, timestamp: Math.round(Date.now() / 1000) - 601}];
        var calls = {passwordWrites: 0};
        membersUtility.db = fakeDb(links, member, calls);

        should.not.exist(await submit("First-p4ssword!"));
        calls.passwordWrites.should.equal(0);
        links.should.have.length(0);
        member.password.should.equal("old");
    });
});
