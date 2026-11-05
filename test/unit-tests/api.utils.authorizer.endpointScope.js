/**
 * A legacy endpoint-restricted token's scope matches the request path from its
 * start (or right after the deployment's path prefix), not anywhere in it.
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
        authorize.matchesFromPathStart(/\/v2\/reports/, "/countly/v2/reports/x/preview").should.equal(true);
        authorize.matchesFromPathStart(/\/v2\/reports/, "/countly/o/apps/mine/v2/reports/x/preview").should.equal(false);
        authorize.matchesFromPathStart(/^\/v2\/reports/, "/v2/reports/x").should.equal(true);
    });
});
