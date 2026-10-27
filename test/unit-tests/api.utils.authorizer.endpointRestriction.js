/**
 * A new token's endpoint restriction names literal API paths, stored anchored at both ends and
 * matched exactly; endpointquery values are literal too.
 */
require("should");
var common = require("../../api/utils/common.js");
var authorize = require("../../api/utils/authorizer.js");

describe("endpoint restriction of a new token", function() {
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
    * Verify a token with a stored endpoint field against a request.
    * @param {Array} endpoint - the token's stored endpoint field
    * @param {string} path - request path
    * @param {object} qstring - request query string
    * @returns {Promise<boolean>} whether the token was accepted
    */
    function verify(endpoint, path, qstring) {
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
                qstring: qstring || {},
                callback: function(owner) {
                    resolve(!!owner);
                }
            });
        });
    }

    it("refuses anything but literal API paths with at least two segments", function() {
        ["", " ", "/", "/o", "o/actions", ".*", "^", "(.*)", "/o/.*", "/o/actions.*", "^/o/actions$", "/o/[a-z]+", "/o/actions|/i/users", "/o/actions,", ",/o/actions", "/o/ac tions", "/o//actions", "/o/actions/", "/o/act\\ions"].forEach(function(value) {
            authorize.parseEndpointRestriction(value).should.eql({error: "Invalid endpoint"}, JSON.stringify(value));
        });
        authorize.parseEndpointRestriction(["/o/actions"]).should.eql({error: "Invalid endpoint"});
    });

    it("refuses endpointquery entries that are not literal", function() {
        ["[]", "{}", "x", "[\"/o/actions\"]", JSON.stringify([{endpoint: "/o"}]), JSON.stringify([{endpoint: ".*", params: {}}]),
            JSON.stringify([{endpoint: "/o/actions", params: {method: ".*"}}]), JSON.stringify([{endpoint: "/o/actions", params: {method: ""}}]),
            JSON.stringify([{endpoint: "/o/actions", params: {"a.b": "x"}}]), JSON.stringify([{endpoint: "/o/actions", params: {method: 1}}]),
            JSON.stringify([{endpoint: "/o/actions", params: []}])].forEach(function(value) {
            authorize.parseEndpointRestriction(undefined, value).should.eql({error: "Invalid endpointquery"}, value);
        });
        authorize.parseEndpointRestriction("/o/actions", "[]").should.have.property("error");
    });

    it("stores literal paths anchored at their end", function() {
        authorize.parseEndpointRestriction(undefined, undefined).should.eql({endpoint: ""});
        authorize.parseEndpointRestriction("/o/actions").should.eql({endpoint: ["^/o/actions$"]});
        authorize.parseEndpointRestriction("/o/apps/mine,/o/token/check").should.eql({endpoint: ["^/o/apps/mine$", "^/o/token/check$"]});
        authorize.parseEndpointRestriction(undefined, JSON.stringify([{endpoint: "/o/analytics", params: {method: "get_events"}}]))
            .should.eql({endpoint: [{endpoint: "^/o/analytics$", params: {method: "^get_events$"}}]});
    });

    it("matches a stored path exactly", async function() {
        var stored = authorize.parseEndpointRestriction("/o/actions").endpoint;
        (await verify(stored, "/o/actions")).should.equal(true);
        (await verify(stored, "/o/actionsfoo")).should.equal(false);
        (await verify(stored, "/o/actions/x")).should.equal(false);
        (await verify(stored, "/i/users/create/o/actions")).should.equal(false);
    });

    it("matches endpointquery values exactly", async function() {
        var stored = authorize.parseEndpointRestriction(undefined, JSON.stringify([{endpoint: "/o/analytics", params: {method: "get_events"}}])).endpoint;
        (await verify(stored, "/o/analytics", {method: "get_events"})).should.equal(true);
        (await verify(stored, "/o/analytics", {method: "get_events_all"})).should.equal(false);
        (await verify(stored, "/o/analytics", {method: "xget_events"})).should.equal(false);
        (await verify(stored, "/o/analytics/x", {method: "get_events"})).should.equal(false);
    });
});
