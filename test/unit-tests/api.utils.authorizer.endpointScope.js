/**
 * A legacy endpoint-restricted token's scope must match the request path from
 * its start.
 *
 * Scopes are regex strings, usually written without ^, and were tested anywhere
 * in the path. v1 routes on the first path segments and ignores the rest, so a
 * token scoped to /o/analytics/dashboard reached /i/users/create as its owner by
 * asking for /i/users/create/o/analytics/dashboard.
 */
require("should");
var common = require("../../api/utils/common.js");
var authorize = require("../../api/utils/authorizer.js");

describe("legacy token endpoint scope", function() {
    var originalDb, originalPath;

    beforeEach(function() {
        originalDb = common.db;
        originalPath = common.config.path;
        common.config.path = "";
    });

    afterEach(function() {
        common.db = originalDb;
        common.config.path = originalPath;
    });

    /**
    * Verify a token scoped to endpoints against a request path.
    * @param {Array} endpoint - the token's endpoint scope
    * @param {string} path - request path
    * @returns {Promise<boolean>} whether the token was accepted
    */
    function verify(endpoint, path) {
        var db = {
            collection: function() {
                return {
                    findOne: function(query, callback) {
                        callback(null, {_id: "T", owner: "o", ttl: 0, multi: true, app: "", endpoint: endpoint});
                    }
                };
            }
        };
        return new Promise(function(resolve) {
            authorize.verify_return({
                db: db,
                token: "T",
                req_path: path,
                qstring: {},
                callback: function(owner) {
                    resolve(!!owner);
                }
            });
        });
    }

    it("accepts the path it is scoped to, and paths under it", async function() {
        (await verify(["/o/analytics/dashboard"], "/o/analytics/dashboard")).should.equal(true);
        (await verify(["/o/analytics"], "/o/analytics/dashboard")).should.equal(true);
        (await verify([{endpoint: "/o/analytics", params: {}}], "/o/analytics/dashboard")).should.equal(true);
    });

    it("refuses a path that only ends in the one it is scoped to", async function() {
        (await verify(["/o/analytics/dashboard"], "/i/users/create/o/analytics/dashboard")).should.equal(false);
        (await verify([{endpoint: "/o/analytics/dashboard"}], "/i/apps/delete/o/analytics/dashboard")).should.equal(false);
    });

    it("accepts the scope right after the deployment path prefix", function() {
        common.config.path = "/countly";
        authorize.matchesFromPathStart(/\/o\/analytics\/dashboard/, "/countly/o/analytics/dashboard").should.equal(true);
        authorize.matchesFromPathStart(/\/o\/analytics\/dashboard/, "/countly/i/users/create/o/analytics/dashboard").should.equal(false);
        authorize.matchesFromPathStart(/^\/o\/analytics/, "/o/analytics/dashboard").should.equal(true);
    });
});
