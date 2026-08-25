require("should");
var common = require("../../api/utils/common.js");

// api_key and auth_token are request parameters, so any handler that keeps input
// it does not recognise stores the caller's credential, and a document read back
// later hands that credential to everyone allowed to read it. Handlers that cannot
// enumerate their own shape can still refuse to keep those two.

describe("common.stripRequestCredentials", function() {
    it("removes the request's authentication parameters", function() {
        var doc = {name: "an alert", api_key: "CALLER_KEY", auth_token: "CALLER_TOKEN"};
        common.stripRequestCredentials(doc);
        doc.should.not.have.property("api_key");
        doc.should.not.have.property("auth_token");
    });

    it("leaves everything else alone", function() {
        var doc = {name: "an alert", emails: ["a@b.test"], nested: {api_key: "theirs"}};
        common.stripRequestCredentials(doc);
        doc.name.should.equal("an alert");
        doc.emails.should.eql(["a@b.test"]);
        // deliberately top level only: a value the caller nested in their own payload
        // is their own to disclose, and descending would mean guessing at shapes
        doc.nested.api_key.should.equal("theirs");
    });

    it("returns the same object so it can be used inline", function() {
        var doc = {api_key: "x"};
        common.stripRequestCredentials(doc).should.equal(doc);
    });

    it("tolerates values that are not objects", function() {
        (function() {
            common.stripRequestCredentials(null);
            common.stripRequestCredentials(undefined);
            common.stripRequestCredentials("a string");
        }).should.not.throw();
    });

    describe("unsetRequestCredentials", function() {
        it("adds both fields to $unset", function() {
            var update = common.unsetRequestCredentials({$set: {name: "x"}});
            update.$set.should.have.property("name", "x");
            update.$unset.should.have.property("api_key", "");
            update.$unset.should.have.property("auth_token", "");
        });
        it("keeps an existing $unset", function() {
            var update = common.unsetRequestCredentials({$set: {a: 1}, $unset: {stale: ""}});
            update.$unset.should.have.property("stale", "");
            update.$unset.should.have.property("api_key", "");
        });
        it("does not put the same field in $set and $unset, which mongo refuses", function() {
            var doc = common.stripRequestCredentials({name: "x", api_key: "SECRET", auth_token: "T"});
            var update = common.unsetRequestCredentials({$set: doc});
            update.$set.should.not.have.property("api_key");
            update.$set.should.not.have.property("auth_token");
            update.$unset.should.have.property("api_key", "");
        });
        it("tolerates being called with nothing", function() {
            var update = common.unsetRequestCredentials();
            update.$unset.should.have.property("api_key", "");
        });
    });
});
