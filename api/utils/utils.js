/**
* Module for some common utility functions that needs to be separated from {@link module:api/utils/common} either due to circular references or other reasons
* @module api/utils/utils
*/
var crypto = require('crypto'),
    countlyConfig = require('./../config', 'dont-enclose');

if (!countlyConfig.encryption) {
    countlyConfig.encryption = {};
}

/**
* Encrypt provided value
* @param {string} text - value to encrypt
* @param {string=} key - key used for encryption and decryption
* @param {string=} iv - initialization vector to make encryption more secure
* @param {string=} algorithm - name of the algorithm to use for encryption. The algorithm is dependent on OpenSSL, examples are 'aes192', etc. On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms. Default value is aes-256-cbc
* @param {string=} input_encoding - how encryption input is encoded. Used as output for decrypting. Default utf-8.
* @param {string=} output_encoding - how encryption output is encoded. Used as input for decrypting. Default hex.
* @returns {string} encrypted value
*/
exports.encrypt = function(text, key, iv, algorithm, input_encoding, output_encoding) {
    var cipher, crypted;
    if (typeof key === "undefined") {
        key = countlyConfig.encryption.key || "dpYheF85";
    }

    //pad or shrink to 32 bytes
    key = Buffer.concat([Buffer.from(key), Buffer.alloc(32)], 32);

    if (typeof iv === "undefined") {
        iv = crypto.randomBytes(16);
    }
    if (typeof algorithm === "undefined") {
        //The algorithm is dependent on OpenSSL, examples are 'aes192', etc. 
        //On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms.
        algorithm = countlyConfig.encryption.algorithm || "aes-256-cbc";
    }
    if (typeof input_encoding === "undefined") {
        input_encoding = countlyConfig.encryption.input_encoding || "utf-8";
    }
    if (typeof output_encoding === "undefined") {
        output_encoding = countlyConfig.encryption.output_encoding || "hex";
    }
    cipher = crypto.createCipheriv(algorithm, key, iv);
    crypted = cipher.update(text, input_encoding, output_encoding);
    crypted += cipher.final(output_encoding);
    return iv.toString('hex') + ':' + crypted + "[CLY]_true";
};

/**
* Decrypt provided value
* @param {string} crypted - value to decrypt
* @param {string=} key - key used for encryption and decryption
* @param {string=} iv - initialization vector used in encryption
* @param {string=} algorithm - name of the algorithm used in encryption. The algorithm is dependent on OpenSSL, examples are 'aes192', etc. On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms. Default value is aes-256-cbc
* @param {string=} input_encoding - how decryption input is encoded. Default hex.
* @param {string=} output_encoding - how decryption output is encoded. Default utf-8.
* @returns {string} decrypted value
*/
exports.decrypt = function(crypted, key, iv, algorithm, input_encoding, output_encoding) {
    if (!crypted || !crypted.length || typeof crypted !== "string") {
        return crypted;
    }

    if (crypted.indexOf(":") === -1) {
        return this.decrypt_old(crypted, key, iv, algorithm, input_encoding, output_encoding);
    }

    if (crypted.lastIndexOf("[CLY]_true") === -1 || crypted.lastIndexOf("[CLY]_true") !== crypted.length - 10) {
        return crypted;
    }
    else {
        crypted = crypted.substring(0, crypted.length - 10);
    }

    var parts = crypted.split(':');
    var ivPart = Buffer.from(parts.shift(), 'hex');
    var encryptedText = Buffer.from(parts.join(':'), 'hex');

    var decipher, decrypted;
    if (typeof key === "undefined") {
        key = countlyConfig.encryption.key || "dpYheF85";
    }

    //pad or shrink to 32 bytes
    key = Buffer.concat([Buffer.from(key), Buffer.alloc(32)], 32);

    if (typeof iv === "undefined") {
        iv = countlyConfig.encryption.iv || ivPart;
    }
    if (typeof algorithm === "undefined") {
        //The algorithm is dependent on OpenSSL, examples are 'aes192', etc. 
        //On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms.
        algorithm = countlyConfig.encryption.algorithm || "aes-256-cbc";
    }
    if (typeof input_encoding === "undefined") {
        input_encoding = countlyConfig.encryption.output_encoding || "hex";
    }
    if (typeof output_encoding === "undefined") {
        output_encoding = countlyConfig.encryption.input_encoding || "utf-8";
    }

    decipher = crypto.createDecipheriv(algorithm, key, iv);

    decrypted = decipher.update(encryptedText, input_encoding, output_encoding);
    decrypted += decipher.final(output_encoding);
    return decrypted;
};

/**
* Old deprecated decrypt function, needed for old stored values
* @param {string} crypted - value to decrypt
* @param {string=} key - key used for encryption and decryption
* @param {string=} iv - initialization vector used in encryption
* @param {string=} algorithm - name of the algorithm used in encryption. The algorithm is dependent on OpenSSL, examples are 'aes192', etc. On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms. Default value is aes-256-cbc
* @param {string=} input_encoding - how decryption input is encoded. Default hex.
* @param {string=} output_encoding - how decryption output is encoded. Default utf-8.
* @returns {string} decrypted value
*/
exports.decrypt_old = function(crypted, key, iv, algorithm, input_encoding, output_encoding) {
    if (!crypted || !crypted.length || typeof crypted !== "string") {
        return crypted;
    }
    if (crypted.lastIndexOf("[CLY]_true") === -1 || crypted.lastIndexOf("[CLY]_true") !== crypted.length - 10) {
        return crypted;
    }
    else {
        crypted = crypted.substring(0, crypted.length - 10);
    }
    var decipher, decrypted;
    if (typeof key === "undefined") {
        key = countlyConfig.encryption.key || "dpYheF85";
    }
    if (typeof iv === "undefined") {
        iv = countlyConfig.encryption.iv;
    }
    if (typeof algorithm === "undefined") {
        //The algorithm is dependent on OpenSSL, examples are 'aes192', etc. 
        //On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms.
        algorithm = countlyConfig.encryption.algorithm || "aes-256-cbc";
    }
    if (typeof input_encoding === "undefined") {
        input_encoding = countlyConfig.encryption.output_encoding || "hex";
    }
    if (typeof output_encoding === "undefined") {
        output_encoding = countlyConfig.encryption.input_encoding || "utf-8";
    }
    if (iv) {
        decipher = crypto.createDecipheriv(algorithm, key, iv);
    }
    else {
        //values encrypted without an IV were written with crypto.createCipher, which Node.js 22 removed;
        //derive the key and IV the way it did, so they decrypt the same on every Node.js version
        var derived = deriveLegacyKeyAndIv(algorithm, key);
        decipher = crypto.createDecipheriv(algorithm, derived.key, derived.iv);
    }
    decrypted = decipher.update(crypted, input_encoding, output_encoding);
    decrypted += decipher.final(output_encoding);
    return decrypted;
};

/**
* Derive the key and IV that the removed crypto.createCipher/createDecipher derived from a password:
* OpenSSL EVP_BytesToKey with MD5, one iteration and no salt
* @param {string} algorithm - cipher name, as passed to createDecipheriv
* @param {string|Buffer} password - the password the value was encrypted with
* @returns {object} {key: Buffer, iv: Buffer|null}, iv is null for ciphers that take none
*/
function deriveLegacyKeyAndIv(algorithm, password) {
    var info = crypto.getCipherInfo(algorithm);
    if (!info) {
        throw new Error("Unknown cipher algorithm: " + algorithm);
    }
    var keyLength = info.keyLength;
    var ivLength = info.ivLength || 0;
    var passwordBuffer = Buffer.from(password);
    var blocks = [];
    var total = 0;
    var previous = Buffer.alloc(0);
    while (total < keyLength + ivLength) {
        previous = crypto.createHash("md5").update(Buffer.concat([previous, passwordBuffer])).digest();
        blocks.push(previous);
        total += previous.length;
    }
    var material = Buffer.concat(blocks);
    return {
        key: material.subarray(0, keyLength),
        iv: ivLength ? material.subarray(keyLength, keyLength + ivLength) : null
    };
}