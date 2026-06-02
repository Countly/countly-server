var should = require("should");
var ssrf = require("../../api/utils/ssrf-protection");

// These tests use IP literals only, so isUrlSafe and safeLookup do not perform
// any network DNS resolution and the assertions are deterministic.
describe("SSRF protection utility", function() {
    describe("isUrlSafe", function() {
        it("blocks the cloud metadata address", async function() {
            (await ssrf.isUrlSafe("http://169.254.169.254/latest/meta-data/")).safe.should.equal(false);
        });
        it("blocks loopback", async function() {
            (await ssrf.isUrlSafe("http://127.0.0.1/")).safe.should.equal(false);
        });
        it("blocks private ranges", async function() {
            (await ssrf.isUrlSafe("http://10.0.0.1/")).safe.should.equal(false);
            (await ssrf.isUrlSafe("http://192.168.1.1/")).safe.should.equal(false);
        });
        it("blocks non-http(s) protocols", async function() {
            (await ssrf.isUrlSafe("ftp://8.8.8.8/")).safe.should.equal(false);
        });
        it("blocks embedded credentials", async function() {
            (await ssrf.isUrlSafe("http://user:pass@8.8.8.8/")).safe.should.equal(false);
        });
        it("allows a public IP literal", async function() {
            (await ssrf.isUrlSafe("http://8.8.8.8/")).safe.should.equal(true);
        });
    });

    describe("safeLookup (connect-time DNS pinning)", function() {
        it("rejects a blocked resolved IP", function(done) {
            ssrf.safeLookup("127.0.0.1", {}, function(err, address) {
                should.exist(err);
                err.code.should.equal("ESSRFBLOCKED");
                should.not.exist(address);
                done();
            });
        });
        it("allows a public IP", function(done) {
            ssrf.safeLookup("8.8.8.8", {}, function(err, address) {
                should.not.exist(err);
                address.should.equal("8.8.8.8");
                done();
            });
        });
        it("supports the (hostname, callback) signature", function(done) {
            ssrf.safeLookup("10.0.0.1", function(err) {
                should.exist(err);
                err.code.should.equal("ESSRFBLOCKED");
                done();
            });
        });
    });

    describe("getSsrfSafeOptions", function() {
        it("disables redirects and pins the lookup", function() {
            var opts = ssrf.getSsrfSafeOptions({uri: "http://8.8.8.8/"});
            opts.followRedirect.should.equal(false);
            opts.lookup.should.equal(ssrf.safeLookup);
        });
    });
});
