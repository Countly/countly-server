var assert = require("assert");
var crypto = require("crypto");
var utils = require("../../api/utils/utils.js");

// Values encrypted without an IV by old Countly versions were written with crypto.createCipher,
// which Node.js 22 removed. They have to decrypt the same on Node.js 20 and on Node.js 22+.
// These ciphertexts were produced independently of Node.js with
//   printf 'JBSWY3DPEHPK3PXP' | openssl enc -<alg> -md md5 -nosalt -pass pass:<key> | xxd -p
// which derives the key and IV exactly as createCipher did.
var PLAIN = "JBSWY3DPEHPK3PXP";
var VECTORS = [
    {algorithm: "aes-256-cbc", key: "dpYheF85", crypted: "892fa937ddec6e22443652fbe4cb045f4c0085a335b0b82359d153d3fbcf991b"},
    {algorithm: "aes-256-cbc", key: "pässwörd-ü", crypted: "354bd96ba2cc7f46a25ff0789e8e7255729e23b81055e3abb766cb144264dc75"},
    {algorithm: "aes192", key: "dpYheF85", crypted: "b3dd1b8e65bdfd340def73ff0586bca6ba81352c762528a4c4d0798cc5dced47"},
    {algorithm: "aes-128-cbc", key: "pässwörd-ü", crypted: "dc2fd190a22b1f2582039679a5b8fa42465897ec242d26499e5398b747562570"}
];

describe("decrypt_old for values encrypted without an IV", function() {
    VECTORS.forEach(function(v) {
        it("decrypt_old reads a " + v.algorithm + " value encrypted with key " + JSON.stringify(v.key), function() {
            assert.strictEqual(utils.decrypt_old(v.crypted + "[CLY]_true", v.key, null, v.algorithm, "hex", "utf-8"), PLAIN);
        });

        it("decrypt routes an IV-less " + v.algorithm + " value with key " + JSON.stringify(v.key) + " to decrypt_old", function() {
            assert.strictEqual(utils.decrypt(v.crypted + "[CLY]_true", v.key, undefined, v.algorithm, "hex", "utf-8"), PLAIN);
        });
    });

    it("does not need crypto.createDecipher", function() {
        var original = crypto.createDecipher;
        crypto.createDecipher = undefined;
        try {
            assert.strictEqual(utils.decrypt_old(VECTORS[0].crypted + "[CLY]_true", VECTORS[0].key, null, VECTORS[0].algorithm, "hex", "utf-8"), PLAIN);
        }
        finally {
            crypto.createDecipher = original;
        }
    });

    // On Node.js versions that still ship crypto.createCipher, a value it writes must read back
    if (typeof crypto.createCipher === "function") {
        it("reads back what crypto.createCipher writes on this Node.js version", function() {
            ["aes-256-cbc", "aes192", "aes-128-cbc"].forEach(function(algorithm) {
                ["dpYheF85", "pässwörd-ü", "a-much-longer-encryption-key-than-32-bytes!"].forEach(function(key) {
                    var cipher = crypto.createCipher(algorithm, key);
                    var crypted = cipher.update("some 2FA secret ✓", "utf-8", "hex") + cipher.final("hex");
                    assert.strictEqual(utils.decrypt_old(crypted + "[CLY]_true", key, null, algorithm, "hex", "utf-8"), "some 2FA secret ✓", algorithm + " / " + key);
                });
            });
        });
    }
});
