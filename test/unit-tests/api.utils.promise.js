/* eslint-disable no-restricted-syntax -- this file tests the bluebird-compatible methods the rule flags */
require("should");
var CountlyPromise = require("../../api/utils/promise.js");

// api/utils/promise.js replaces bluebird. It is the native Promise plus the three bluebird
// methods this codebase calls: Promise.each, .spread and .asCallback. These pin the bluebird
// behaviour each call site relies on.
describe("CountlyPromise, the bluebird replacement", function() {
    describe("each", function() {
        it("runs the iterator one item at a time, in order, waiting for each promise", async function() {
            var log = [];
            await CountlyPromise.each([30, 10, 20], function(ms, index, length) {
                log.push("start " + index + "/" + length);
                return new Promise(function(resolve) {
                    setTimeout(function() {
                        log.push("end " + index);
                        resolve();
                    }, ms);
                });
            });
            log.should.eql(["start 0/3", "end 0", "start 1/3", "end 1", "start 2/3", "end 2"]);
        });

        it("resolves to the original array, not to the iterator results", async function() {
            var list = [1, 2, 3];
            var result = await CountlyPromise.each(list, function(x) {
                return x * 10;
            });
            result.should.equal(list);
        });

        it("accepts a promise of the list", async function() {
            var seen = [];
            await CountlyPromise.each(Promise.resolve(["a", "b"]), function(x) {
                seen.push(x);
            });
            seen.should.eql(["a", "b"]);
        });

        it("stops at the first rejection", async function() {
            var seen = [];
            var error = await CountlyPromise.each([1, 2, 3], function(x) {
                seen.push(x);
                if (x === 2) {
                    throw new Error("stop at " + x);
                }
            }).then(function() {
                return null;
            }, function(err) {
                return err;
            });
            error.message.should.equal("stop at 2");
            seen.should.eql([1, 2]);
        });
    });

    describe("spread", function() {
        it("spreads Promise.all results as arguments", async function() {
            var sum = await CountlyPromise.all([1, Promise.resolve(2), 3]).spread(function(a, b, c) {
                return a + b + c;
            });
            sum.should.equal(6);
        });

        it("is available further down a then chain", async function() {
            var joined = await CountlyPromise.resolve("x").then(function(x) {
                return [x, "y"];
            }).spread(function(a, b) {
                return a + b;
            });
            joined.should.equal("xy");
        });
    });

    describe("asCallback", function() {
        it("hands a resolved value to a node-style callback", function(done) {
            CountlyPromise.resolve(42).asCallback(function(err, value) {
                (err === null).should.be.true();
                value.should.equal(42);
                done();
            });
        });

        it("hands a rejection to the callback as its error", function(done) {
            CountlyPromise.reject(new Error("nope")).asCallback(function(err) {
                err.message.should.equal("nope");
                done();
            });
        });

        it("returns the promise unchanged without a callback", function() {
            var p = CountlyPromise.resolve(1);
            p.asCallback().should.equal(p);
        });
    });

    it("keeps the native statics and is a native Promise", async function() {
        var p = CountlyPromise.resolve(1);
        (p instanceof Promise).should.be.true();
        (p instanceof CountlyPromise).should.be.true();
        var settled = await CountlyPromise.allSettled([Promise.resolve(1), Promise.reject(new Error("e"))]);
        settled.map(function(r) {
            return r.status;
        }).should.eql(["fulfilled", "rejected"]);
    });
});
