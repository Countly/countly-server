require("should");
var redaction = require("../../plugins/dbviewer/api/parts/redaction.js");

describe("dbviewer redaction", function() {
    describe("hasRedactedFields", function() {
        it("knows the collections that hold secrets", function() {
            redaction.hasRedactedFields("members").should.equal(true);
            redaction.hasRedactedFields("password_reset").should.equal(true);
        });
        it("is false for ordinary collections", function() {
            redaction.hasRedactedFields("events_data").should.equal(false);
            redaction.hasRedactedFields("apps").should.equal(false);
        });
        it("is false for Object.prototype keys, not truthy by inheritance", function() {
            redaction.hasRedactedFields("constructor").should.equal(false);
            redaction.hasRedactedFields("toString").should.equal(false);
            redaction.hasRedactedFields("__proto__").should.equal(false);
        });
    });

    describe("redactFields", function() {
        it("removes member credentials and keeps the rest", function() {
            var doc = {_id: "1", email: "a@b.c", password: "hash", api_key: "k", two_factor_auth: {}, full_name: "A"};
            redaction.redactFields("members", doc);
            doc.should.not.have.property("password");
            doc.should.not.have.property("api_key");
            doc.should.not.have.property("two_factor_auth");
            doc.should.have.property("email", "a@b.c");
            doc.should.have.property("full_name", "A");
        });
        it("removes the password-reset token and keeps the rest", function() {
            var doc = {_id: "1", prid: "tok", user_id: "u", timestamp: 12345};
            redaction.redactFields("password_reset", doc);
            doc.should.not.have.property("prid");
            doc.should.have.property("user_id", "u");
            doc.should.have.property("timestamp", 12345);
        });
        it("leaves documents from other collections alone", function() {
            var doc = {a: 1, password: "not a member doc"};
            redaction.redactFields("events_data", doc);
            doc.should.have.property("password");
        });
        it("tolerates a missing document", function() {
            (redaction.redactFields("members", null) === null).should.equal(true);
            (redaction.redactFields("members", undefined) === undefined).should.equal(true);
        });
    });

    describe("redactionStage", function() {
        it("excludes every member credential", function() {
            redaction.redactionStage("members").should.eql({$project: {password: 0, api_key: 0, two_factor_auth: 0}});
        });
        it("excludes the password-reset token", function() {
            redaction.redactionStage("password_reset").should.eql({$project: {prid: 0}});
        });
        it("is null for a collection with nothing to hide", function() {
            (redaction.redactionStage("events_data") === null).should.equal(true);
            (redaction.redactionStage("constructor") === null).should.equal(true);
        });
        it("covers exactly the same fields the document path removes", function() {
            // the two paths must not drift: a field dropped from a single-document
            // read but not from an aggregation is a field that leaks
            Object.keys(redaction.REDACTED_FIELDS).forEach(function(collection) {
                var stage = redaction.redactionStage(collection);
                Object.keys(stage.$project).sort().should.eql(redaction.REDACTED_FIELDS[collection].slice().sort());
            });
        });
    });
});
