/**
 * A long task stores the request that started it so it can be rerun. A rerun authenticates
 * as the task's creator, so the stored request keeps no credential from the original query:
 * neither api_key nor auth_token. The running-task lookup builds the same request to compare
 * against, so it drops them too. A rerun of such a request adds the creator's api_key.
 */
require("should");
var common = require("../../api/utils/common.js");
var taskmanager = require("../../api/utils/taskmanager.js");

describe("taskmanager stored request", function() {
    /**
     * Fake db recording long_tasks writes and lookups
     * @returns {object} db with writes and lookups arrays
     */
    function fakeDb() {
        var db = {writes: [], lookups: []};
        db.collection = function() {
            return {
                update: function(query, update, options, callback) {
                    db.writes.push(update);
                    if (callback) {
                        callback(null, {});
                    }
                },
                findOne: function(query, projection, callback) {
                    db.lookups.push(query);
                    callback(null, null);
                }
            };
        };
        return db;
    }

    /**
     * Request params carrying both credentials in the query
     * @returns {object} params
     */
    function params() {
        return {
            fullPath: "/o/some/report",
            member: {_id: "creator1"},
            qstring: {app_id: "app1", api_key: "API_KEY_VALUE", auth_token: "AUTH_TOKEN_VALUE", period: "30days", _: "123"}
        };
    }

    it("stores a long task's request without api_key or auth_token", function() {
        var db = fakeDb();
        var handler = taskmanager.longtask({
            db: db,
            force: true,
            params: params(),
            app_id: "app1",
            type: "test",
            outputData: function() {}
        });
        handler.should.be.a.Function();
        db.writes.length.should.equal(1);
        var request = JSON.parse(db.writes[0].$set.request);
        request.json.should.have.property("period", "30days");
        request.json.should.not.have.property("api_key");
        request.json.should.not.have.property("auth_token");
        db.writes[0].$set.request.should.not.match(/AUTH_TOKEN_VALUE|API_KEY_VALUE/);
    });

    it("looks for a running task by a request without api_key or auth_token", function(done) {
        var db = fakeDb();
        taskmanager.checkIfRunning({db: db, params: params()}, function() {
            db.lookups.length.should.equal(1);
            var request = JSON.parse(db.lookups[0].request);
            request.json.should.have.property("period", "30days");
            request.json.should.not.have.property("api_key");
            request.json.should.not.have.property("auth_token");
            done();
        });
    });

    it("reruns a stored request without credentials as the task's creator", function(done) {
        var originalDb = common.db;
        var originalProcessRequest = common.processRequest;
        var stored = {
            _id: "task1",
            creator: "creator1",
            request: JSON.stringify({uri: "http://localhost/o/some/report", method: "POST", json: {app_id: "app1", period: "30days"}})
        };
        common.db = {
            ObjectID: function(id) {
                return id;
            }
        };
        var db = {
            collection: function(name) {
                return {
                    findOne: function(query, callback) {
                        callback(null, name === "long_tasks" ? stored : {_id: "creator1", api_key: "CREATOR_KEY"});
                    },
                    update: function(query, update, callback) {
                        callback(null);
                    }
                };
            }
        };
        common.processRequest = function(params) {
            common.db = originalDb;
            common.processRequest = originalProcessRequest;
            params.req.body.should.have.property("api_key", "CREATOR_KEY");
            params.req.body.should.not.have.property("auth_token");
            params.req.body.should.have.property("task_id", "task1");
            done();
        };
        taskmanager.rerunTask({db: db, id: "task1"}, function() {});
    });
});
