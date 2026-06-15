require("should");
var exporter = require("../../api/parts/data/exports.js");

describe("export credential redaction", function() {
    describe("redactsExportCollection", function() {
        it("flags privileged collections", function() {
            exporter.redactsExportCollection("members").should.equal(true);
            exporter.redactsExportCollection("auth_tokens").should.equal(true);
        });
        it("does not flag ordinary collections", function() {
            exporter.redactsExportCollection("app_users5f0000000000000000000000").should.equal(false);
            exporter.redactsExportCollection("events_data").should.equal(false);
            exporter.redactsExportCollection("drill_events").should.equal(false);
        });
    });

    describe("redactExportDoc", function() {
        it("strips credential fields from members docs", function() {
            var doc = {
                _id: "abc",
                email: "a@b.com",
                full_name: "A B",
                password: "hashed-secret",
                api_key: "deadbeef",
                two_factor_auth: {secret: "TOTP"}
            };
            var out = exporter.redactExportDoc("members", doc);
            out.should.have.property("email", "a@b.com");
            out.should.have.property("full_name", "A B");
            out.should.not.have.property("password");
            out.should.not.have.property("api_key");
            out.should.not.have.property("two_factor_auth");
        });
        it("masks the token id on auth_tokens docs", function() {
            var doc = {_id: "raw-token-value", owner: "u1", purpose: "LoggedInAuth"};
            var out = exporter.redactExportDoc("auth_tokens", doc);
            out.should.have.property("_id", "***redacted***");
            out.should.have.property("owner", "u1");
        });
        it("leaves ordinary collections untouched", function() {
            var doc = {_id: "x", did: "device-1", uid: "1", custom: {plan: "pro"}};
            var out = exporter.redactExportDoc("app_users5f0000000000000000000000", doc);
            out.should.have.property("_id", "x");
            out.should.have.property("did", "device-1");
            out.should.have.property("custom");
        });
        it("tolerates a null/undefined doc", function() {
            (exporter.redactExportDoc("members", null) === null).should.equal(true);
        });
    });
});
