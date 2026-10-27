require("should");
var testUtils = require("../testUtils");

// Plugin tests poll with these helpers where an endpoint answers before its
// write has finished. A poll must return on the first passing check, keep going
// while the check fails, and fail with the last failure once the budget is used.

describe("testUtils polling helpers", function() {
    describe("waitForAssertion", function() {
        it("succeeds on the first passing check without waiting", function(done) {
            var calls = 0;
            var started = Date.now();
            testUtils.waitForAssertion({
                check: function(cb) {
                    calls++;
                    cb();
                },
                interval: 1000
            }, function(err) {
                (err === undefined).should.be.true();
                calls.should.equal(1);
                (Date.now() - started).should.be.below(500);
                done();
            });
        });

        it("retries failing and throwing checks until one passes", function(done) {
            var calls = 0;
            testUtils.waitForAssertion({
                check: function(cb) {
                    calls++;
                    if (calls === 1) {
                        throw new Error("not yet");
                    }
                    cb(calls < 3 ? new Error("still not") : undefined);
                },
                interval: 10
            }, function(err) {
                (err === undefined).should.be.true();
                calls.should.equal(3);
                done();
            });
        });

        it("fails with the last failure when the budget is used", function(done) {
            testUtils.waitForAssertion({
                check: function(cb) {
                    cb(new Error("count was 8"));
                },
                timeout: 50,
                interval: 10,
                description: "nine funnels"
            }, function(err) {
                err.should.be.an.instanceOf(Error);
                err.message.should.containEql("nine funnels");
                err.message.should.containEql("count was 8");
                done();
            });
        });
    });

    describe("eventually", function() {
        it("resolves once an async check stops rejecting", async function() {
            var calls = 0;
            await testUtils.eventually(async function() {
                calls++;
                calls.should.be.above(2);
            }, {interval: 10});
            calls.should.equal(3);
        });

        it("rejects with the last failure on timeout", async function() {
            var failure;
            try {
                await testUtils.eventually(function() {
                    throw new Error("never there");
                }, {timeout: 50, interval: 10});
            }
            catch (err) {
                failure = err;
            }
            failure.message.should.containEql("never there");
        });
    });

    describe("validateEventually", function() {
        it("passes when the first response already satisfies the assertion", function(done) {
            var res = {text: "[1,2,3]", req: {path: "/o?method=x"}};
            testUtils.validateEventually(null, res, function(err) {
                (err === undefined).should.be.true();
                done();
            }, function(current) {
                JSON.parse(current.text).should.have.length(3);
            });
        });

        it("fails at once on a request error that cannot be repeated", function(done) {
            var failure = new Error("socket hang up");
            testUtils.validateEventually(failure, null, function(err) {
                err.should.equal(failure);
                done();
            }, function() {});
        });
    });
});
