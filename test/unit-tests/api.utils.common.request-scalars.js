var should = require("should");
var common = require("../../api/utils/common.js");

// HTTP delivers text. A parameter that carries structure is sent as JSON and parsed by
// the endpoint that wants it, which is why those parsers begin with
// `typeof x === "string"`. Form encoding cannot produce a nested value either -
// `view[$ne]=x` yields the literal key "view[$ne]". The only thing that turns a request
// value into an object is the json body parser, on the way in.
//
// asRequestScalar puts it back at the copy into params.qstring, so an endpoint that
// wants a value gets a string - inert in a Mongo match - and one that wants a structure
// parses it, which validateArgs now does for any type it already declares.

describe("request parameters are the scalars HTTP carried", function() {
    describe("asRequestScalar", function() {
        it("leaves a scalar exactly as it is", function() {
            common.asRequestScalar("abc").should.equal("abc");
            common.asRequestScalar("").should.equal("");
            common.asRequestScalar(10).should.equal(10);
            common.asRequestScalar(true).should.equal(true);
            should(common.asRequestScalar(null)).equal(null);
            should(common.asRequestScalar(undefined)).equal(undefined);
        });

        it("turns an operator document back into its json text", function() {
            // in a value position Mongo reads this as a query expression, so an equality
            // match on one document becomes a match on many
            common.asRequestScalar({$ne: null}).should.equal('{"$ne":null}');
            common.asRequestScalar({a: {$regex: ".*"}}).should.equal('{"a":{"$regex":".*"}}');
        });

        it("turns an array into its json text too", function() {
            // one rule rather than one rule and an exception: whether a structure is
            // pre-parsed at all depends on the content type
            common.asRequestScalar(["1", "2"]).should.equal('["1","2"]');
        });

        it("never hands a handler a structure, whatever it is given", function() {
            [{}, [], {$ne: 1}, {a: [{b: {$in: [1]}}]}].forEach(function(value) {
                (typeof common.asRequestScalar(value)).should.equal("string",
                    JSON.stringify(value) + " was left as a structure");
            });
        });
    });

    describe("what the endpoints then see", function() {
        it("gives a scalar parameter something inert in a match", function() {
            var view = common.asRequestScalar({$ne: null});
            (typeof view).should.equal("string");
            view.should.not.have.property("$ne");
        });

        it("lets a declared Object or Array argument arrive as its json text", function() {
            var props = {behavior: {required: false, type: "Object"}, users: {required: false, type: "Array"}};
            var out = common.validateArgs({
                behavior: common.asRequestScalar({a: 1}),
                users: common.asRequestScalar([{x: 1}])
            }, props, true);
            out.result.should.equal(true, JSON.stringify(out.errors));
            out.obj.behavior.should.eql({a: 1});
            out.obj.users.should.eql([{x: 1}]);
        });

        it("carries a nested schema, not only the literal Object and Array types", function() {
            // push describes its message parts with nested schemes, so the widening has
            // to reach that branch too
            var nested = {
                page: {type: "String", required: false},
                stages: {type: "Array", required: false}
            };
            var schema = {state: {required: false, type: nested}};
            var state = {page: "/dashboard", stages: ["a"]};
            var typed = common.validateArgs({state: state}, schema, true);
            typed.result.should.equal(true, JSON.stringify(typed.errors));
            var asText = common.validateArgs({state: common.asRequestScalar(state)}, schema, true);
            asText.result.should.equal(true, JSON.stringify(asText.errors));
            asText.obj.state.should.eql(state);
        });

        it("still refuses text that is not the declared type", function() {
            common.validateArgs({behavior: "not json"},
                {behavior: {required: false, type: "Object"}}, true).result.should.equal(false);
        });

        it("does not change the checksum payload for anything an SDK sends", function() {
            // api.js builds params.formDataUrl from these values and it feeds
            // checksumSaltVerification, so the interpolated text has to be identical for
            // every scalar - which is all a multipart SDK request carries
            ["abc", "", "0", 0, 10, -1, 1.5, true, false, null, undefined].forEach(function(value) {
                ("" + common.asRequestScalar(value)).should.equal("" + value,
                    "checksum payload changed for " + JSON.stringify(value));
            });
        });
    });
});
