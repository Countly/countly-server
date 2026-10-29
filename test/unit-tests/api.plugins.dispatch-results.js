require("should");
var plugins = require("../../plugins/pluginManager.js");

// dispatch hands its callback one result per handler. Callers (app_users, users, apps,
// requestProcessor) read result.status, .value and .reason. Under bluebird those came from
// an adapter over bluebird's inspection objects; with native Promise.allSettled they come
// straight through, and this pins that the shape callers read did not change.
describe("plugins.dispatch callback results", function() {
    var EVENT = "/unit-tests/dispatch-results";

    before(function() {
        plugins.register(EVENT, function() {
            return Promise.resolve("handled");
        });
        plugins.register(EVENT, function() {
            return Promise.reject(new Error("handler failed"));
        });
        plugins.register(EVENT, function() {
            throw new Error("handler threw");
        });
    });

    it("reports each handler as fulfilled with its value or rejected with its reason", function(done) {
        plugins.dispatch(EVENT, {}, function(err, results) {
            (err === null).should.be.true();
            results.length.should.equal(3);
            results[0].status.should.equal("fulfilled");
            results[0].value.should.equal("handled");
            results[1].status.should.equal("rejected");
            results[1].reason.message.should.equal("handler failed");
            results[2].status.should.equal("rejected");
            results[2].reason.message.should.equal("handler threw");
            done();
        });
    });
});
