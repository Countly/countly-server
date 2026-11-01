var assert = require("assert");
var crypto = require("crypto");
var utils = require("../../api/utils/utils.js");

// Values encrypted without an IV by old Countly versions need crypto.createDecipher, which
// Node.js 22 removed; decrypting one there has to fail with a message that says what to do.
describe("decrypt_old without crypto.createDecipher", function() {
    var original;
    beforeEach(function() {
        original = crypto.createDecipher;
        crypto.createDecipher = undefined;
    });
    afterEach(function() {
        crypto.createDecipher = original;
    });

    it("explains that the value has to be encrypted again", function() {
        assert.throws(function() {
            utils.decrypt_old("00ff", "key", null, "aes-256-cbc", "utf-8", "hex");
        }, /encrypted without an IV.*encrypt it again/);
    });
});
