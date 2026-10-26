var should = require("should");
var remoteConfig = require("../../plugins/remote-config/api/parts/rc.js");

// The remote-config evaluator decides whether a condition applies to a user. A rule it
// cannot evaluate must match nobody, never everybody.

describe("remote-config processFilter", function() {
    var user = {
        uid: "1",
        p: "Android",
        cc: "US",
        av: "2:1:0",
        sc: 5,
        custom: {plan: "pro", optedIn: false}
    };

    /**
    * Evaluate a query against the user
    * @param {object} query - targeting query
    * @param {Array} issues - optional collector for rules that cannot be evaluated
    * @returns {boolean} whether the user matches
    **/
    function evaluate(query, issues) {
        return remoteConfig.processFilter(user, JSON.parse(JSON.stringify(query)), issues);
    }

    it("honours $eq", function() {
        evaluate({p: {$eq: "Android"}}).should.equal(true);
        evaluate({p: {$eq: "iOS"}}).should.equal(false);
    });

    it("honours $ne", function() {
        evaluate({p: {$ne: "iOS"}}).should.equal(true);
        evaluate({p: {$ne: "Android"}}).should.equal(false);
    });

    it("still matches equality, $in, $nin and ranges", function() {
        evaluate({p: "Android"}).should.equal(true);
        evaluate({p: "iOS"}).should.equal(false);
        evaluate({cc: {$in: ["US", "DE"]}}).should.equal(true);
        evaluate({cc: {$nin: ["US"]}}).should.equal(false);
        evaluate({sc: {$gte: 5, $lt: 10}}).should.equal(true);
        evaluate({sc: {$gt: 5}}).should.equal(false);
    });

    it("compares a numeric string by its whole value", function() {
        remoteConfig.processFilter({custom: {score: "15"}}, {"custom.score": {$gt: 10}}).should.equal(true);
        remoteConfig.processFilter({custom: {score: "12points"}}, {"custom.score": {$gt: 10}}).should.equal(false);
        remoteConfig.processFilter({custom: {score: ""}}, {"custom.score": {$gte: 0}}).should.equal(false);
    });

    it("ANDs sibling properties", function() {
        evaluate({p: "Android", cc: "US"}).should.equal(true);
        evaluate({p: "Android", cc: "DE"}).should.equal(false);
        evaluate({$or: [{p: "Android"}], cc: "DE"}).should.equal(false);
    });

    it("resolves custom properties and treats false as a value", function() {
        evaluate({"custom.plan": "pro"}).should.equal(true);
        evaluate({"custom.optedIn": false}).should.equal(true);
        evaluate({"custom.missing": "x"}).should.equal(false);
    });

    it("reports an operator it cannot evaluate and matches nobody", function() {
        var issues = [];
        evaluate({p: {$unknownOp: "x"}}, issues).should.equal(false);
        issues.length.should.be.above(0);
    });

    it("does not match on an empty query", function() {
        should(evaluate({})).equal(false);
    });
});
