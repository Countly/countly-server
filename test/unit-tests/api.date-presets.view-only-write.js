require("should");
var common = require("../../api/utils/common.js");
var presets = require("../../api/parts/mgmt/date_presets.js");

// A date preset is found through a deliberately wide selector, because every member it
// is shared with is allowed to reach the update handler: marking a favourite and
// dragging the list both go through it and both send the whole row. So the selector
// cannot be the authorization, and what these tests pin down is the decision made after
// the document comes back.
//
// The case that matters is owner_id. The delete handler requires the caller to be the
// stored owner, which is correct, so anything that lets a viewer write owner_id hands
// them the delete as well.

var PRESET_ID = "aaaaaaaaaaaaaaaaaaaaaaaa";
var APP_ID = "bbbbbbbbbbbbbbbbbbbbbbbb";

var owner = {_id: "owner1", email: "owner@example.test", group_id: []};
var viewer = {_id: "viewer1", email: "viewer@example.test", group_id: []};
var emailEditor = {_id: "editor1", email: "editor@example.test", group_id: []};
var groupEditor = {_id: "editor2", email: "grouped@example.test", group_id: ["g1"]};
var globalAdmin = {_id: "admin1", email: "admin@example.test", global_admin: true, group_id: []};

var stored = {
    _id: PRESET_ID,
    name: "Owner's preset",
    range: ["30days"],
    owner_id: "owner1",
    share_with: "selected-users",
    shared_email_edit: ["editor@example.test"],
    shared_email_view: ["viewer@example.test"],
    shared_user_groups_edit: ["g1"],
    shared_user_groups_view: [],
    fav: [],
    sort_order: 4
};

/**
* Run a handler against a stubbed database and report what it tried to write.
* @param {string} handler - the presetsApi method to call
* @param {object} member - the acting member
* @param {object} qstring - request parameters, merged over a valid baseline
* @param {object} document - the stored preset the find should return
* @returns {object} the captured $set, findOne options, status and message
**/
function run(handler, member, qstring, document) {
    var captured = {set: null, options: null, status: null, message: null, reshuffled: false};

    var realDb = common.db;
    var realMessage = common.returnMessage;
    var realOutput = common.returnOutput;

    common.db = {
        ObjectID: function(id) {
            return id;
        },
        collection: function() {
            return {
                findOne: function(selector, options, callback) {
                    if (typeof options === "function") {
                        callback = options;
                        options = null;
                    }
                    captured.options = options;
                    callback(null, document ? JSON.parse(JSON.stringify(document)) : null);
                },
                update: function(selector, update, options, callback) {
                    captured.set = update.$set;
                    callback(null);
                },
                //called with and without an options argument in different places
                updateMany: function(selector, update, options, callback) {
                    captured.reshuffled = true;
                    (typeof options === "function" ? options : callback)(null);
                },
                insert: function(doc, options, callback) {
                    captured.set = doc;
                    callback(null, {ops: [Object.assign({_id: PRESET_ID}, doc)]});
                }
            };
        }
    };
    common.returnMessage = function(params, status, message) {
        captured.status = status;
        captured.message = message;
    };
    common.returnOutput = function(params, output) {
        captured.status = 200;
        captured.output = output;
    };

    try {
        presets[handler]({
            member: member,
            qstring: Object.assign({app_id: APP_ID, preset_id: PRESET_ID}, qstring)
        });
    }
    finally {
        common.db = realDb;
        common.returnMessage = realMessage;
        common.returnOutput = realOutput;
    }

    return captured;
}

describe("date presets, view only members and writes", function() {
    describe("who may edit", function() {
        it("lets the owner change the preset", function() {
            var result = run("update", owner, {name: "renamed", share_with: "selected-users"}, stored);
            result.status.should.equal(200);
            result.set.name.should.equal("renamed");
        });

        it("lets a member named in shared_email_edit change it", function() {
            var result = run("update", emailEditor, {name: "renamed", share_with: "selected-users"}, stored);
            result.set.name.should.equal("renamed");
        });

        it("lets a member of a group in shared_user_groups_edit change it", function() {
            var result = run("update", groupEditor, {name: "renamed", share_with: "selected-users"}, stored);
            result.set.name.should.equal("renamed");
        });

        it("lets a global admin change it", function() {
            var result = run("update", globalAdmin, {name: "renamed", share_with: "selected-users"}, stored);
            result.set.name.should.equal("renamed");
        });

        it("does not let a view only member change the content", function() {
            var result = run("update", viewer, {name: "vandalised", share_with: "selected-users", fav: true}, stored);
            (result.set.name === undefined).should.equal(true);
        });

        it("does not let a member of a view only group change the content", function() {
            var viewGroup = Object.assign({}, stored, {shared_user_groups_edit: [], shared_user_groups_view: ["g1"]});
            var result = run("update", groupEditor, {name: "vandalised", fav: true}, viewGroup);
            (result.set.name === undefined).should.equal(true);
        });

        it("does not treat share_with all-users as an edit grant", function() {
            var open = Object.assign({}, stored, {share_with: "all-users", shared_email_edit: [], shared_user_groups_edit: []});
            var result = run("update", viewer, {name: "vandalised", fav: true}, open);
            (result.set.name === undefined).should.equal(true);
        });
    });

    describe("owner_id, which the delete handler trusts", function() {
        it("is not writable by a view only member", function() {
            var result = run("update", viewer, {name: "x", owner_id: "viewer1", fav: true}, stored);
            (result.set.owner_id === undefined).should.equal(true);
        });

        it("is not writable by an editor either, since sharing stays the owner's", function() {
            var result = run("update", emailEditor, {name: "x", owner_id: "editor1", share_with: "selected-users"}, stored);
            (result.set.owner_id === undefined).should.equal(true);
        });

        it("is not writable by the owner, so it cannot be handed away by accident", function() {
            var result = run("update", owner, {name: "x", owner_id: "viewer1", share_with: "selected-users"}, stored);
            (result.set.owner_id === undefined).should.equal(true);
        });

        it("is refused outright when a view only member sends nothing else", function() {
            var result = run("update", viewer, {owner_id: "viewer1"}, stored);
            result.status.should.equal(403);
            (result.set === null).should.equal(true);
        });
    });

    describe("what a view only member keeps", function() {
        it("may mark the preset as a favourite", function() {
            var result = run("update", viewer, {name: "ignored", fav: true}, stored);
            result.status.should.equal(200);
            result.set.fav.should.eql(["viewer1"]);
        });

        it("may remove it from favourites again", function() {
            var favourited = Object.assign({}, stored, {fav: ["viewer1"]});
            var result = run("update", viewer, {fav: false}, favourited);
            result.set.fav.should.eql([]);
        });

        it("may reorder the shared list, which the table lets anybody drag", function() {
            var result = run("update", viewer, {sort_order: 1}, stored);
            result.status.should.equal(200);
            result.set.sort_order.should.equal(1);
            result.reshuffled.should.equal(true);
        });

        it("does not stamp edited_at, since nothing was edited", function() {
            var result = run("update", viewer, {name: "ignored", fav: true}, stored);
            (result.set.edited_at === undefined).should.equal(true);
        });

        it("does not clear the sharing lists as a side effect", function() {
            // an editor sending share_with other than selected-users empties these on
            // purpose; a viewer's favourite toggle must not reach that path
            var result = run("update", viewer, {share_with: "none", fav: true}, stored);
            (result.set.shared_email_view === undefined).should.equal(true);
        });
    });

    describe("credentials are not stored on the document", function() {
        it("update does not persist an api_key sent for authentication", function() {
            var result = run("update", owner, {name: "x", share_with: "selected-users", api_key: "OWNER_KEY"}, stored);
            (result.set.api_key === undefined).should.equal(true);
        });

        it("update does not persist an auth_token sent for authentication", function() {
            var result = run("update", owner, {name: "x", share_with: "selected-users", auth_token: "OWNER_TOKEN"}, stored);
            (result.set.auth_token === undefined).should.equal(true);
        });

        it("create does not persist an api_key sent for authentication", function() {
            var result = run("create", owner, {name: "new", share_with: "none", range: JSON.stringify(["2024-01-01", "2024-01-31"]), api_key: "OWNER_KEY"}, null);
            (result.set.api_key === undefined).should.equal(true);
            result.set.owner_id.should.equal("owner1");
        });

        it("create keeps the fields a preset is made of", function() {
            var result = run("create", owner, {name: "new", share_with: "none", range: JSON.stringify(["2024-01-01", "2024-01-31"])}, null);
            result.set.name.should.equal("new");
        });
    });

    describe("reads", function() {
        it("getById projects the preset's own fields rather than the document", function() {
            var result = run("getById", viewer, {}, stored);
            result.options.should.have.property("projection");
            (result.options.projection.api_key === undefined).should.equal(true);
            result.options.projection.owner_id.should.equal(1);
        });
    });
});
