var assert = require("assert");
var basicAuth = require("../../frontend/express/libs/basic-auth.js");

// /api-key reads Basic credentials with this helper, which replaced the basic-auth package
// and keeps its parsing rules: the scheme is case-insensitive, the password may contain colons,
// and anything that isn't valid Basic credentials gives undefined.
describe("basic-auth helper", function() {
    /**
     * Request with an Authorization header
     * @param {string} value - header value
     * @returns {object} request
     */
    function req(value) {
        return {headers: value === undefined ? {} : {authorization: value}};
    }
    /**
     * Base64 of a string
     * @param {string} s - text
     * @returns {string} base64
     */
    function b64(s) {
        return Buffer.from(s).toString("base64");
    }

    it("reads user name and password", function() {
        assert.deepStrictEqual(basicAuth(req("Basic " + b64("user:pass"))), {name: "user", pass: "pass"});
    });
    it("accepts any case and surrounding spaces, keeps colons in the password", function() {
        assert.deepStrictEqual(basicAuth(req("bAsIc   " + b64("u:p:with:colons") + "  ")), {name: "u", pass: "p:with:colons"});
    });
    it("keeps an empty name or password", function() {
        assert.deepStrictEqual(basicAuth(req("Basic " + b64(":p"))), {name: "", pass: "p"});
        assert.deepStrictEqual(basicAuth(req("Basic " + b64("u:"))), {name: "u", pass: ""});
    });
    it("decodes UTF-8", function() {
        assert.deepStrictEqual(basicAuth(req("Basic " + b64("ünï:日本"))), {name: "ünï", pass: "日本"});
    });
    it("gives undefined for anything that is not Basic credentials", function() {
        [undefined, "", "Basic", "Bearer " + b64("u:p"), "Basic !!!", "Basic " + b64("nocolon"), "Basic\t" + b64("u:p")].forEach(function(value) {
            assert.strictEqual(basicAuth(req(value)), undefined, JSON.stringify(value));
        });
        assert.strictEqual(basicAuth({}), undefined);
        assert.strictEqual(basicAuth(undefined), undefined);
    });
});
