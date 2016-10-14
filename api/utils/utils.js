var crypto = require('crypto'),
    countlyConfig = require('./../config', 'dont-enclose');
    
if(!countlyConfig.encryption){
    countlyConfig.encryption = {};
}

exports.encrypt = function(text, key, iv, algorithm, input_encoding, output_encoding) {
    var cipher, crypted;
    if(typeof key === "undefined"){
        key = countlyConfig.encryption.key || "dpYheF85";
    }
    if(typeof iv === "undefined"){
        iv = countlyConfig.encryption.iv;
    }
    if(typeof algorithm === "undefined"){
        //The algorithm is dependent on OpenSSL, examples are 'aes192', etc. 
        //On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms.
        algorithm = countlyConfig.encryption.algorithm || "aes-256-cbc";
    }
    if(typeof input_encoding === "undefined"){
        input_encoding = countlyConfig.encryption.input_encoding || "utf-8";
    }
    if(typeof output_encoding === "undefined"){
        output_encoding = countlyConfig.encryption.output_encoding || "hex";
    }
    if(iv)
        cipher = crypto.createCipheriv(algorithm, key, iv);
    else
        cipher = crypto.createCipher(algorithm, key);
    crypted = cipher.update(text, input_encoding, output_encoding);
    crypted += cipher.final(output_encoding);
    return crypted+"[CLY]_true";
};

exports.decrypt = function(crypted, key, iv, algorithm, input_encoding, output_encoding) {
    if(crypted.lastIndexOf("[CLY]_true") !== crypted.length - 10){
        return crypted;
    }
    else{
        crypted = crypted.substring(0, crypted.length - 10);
    }
    var decipher, decrypted;
    if(typeof key === "undefined"){
        key = countlyConfig.encryption.key || "dpYheF85";
    }
    if(typeof iv === "undefined"){
        iv = countlyConfig.encryption.iv;
    }
    if(typeof algorithm === "undefined"){
        //The algorithm is dependent on OpenSSL, examples are 'aes192', etc. 
        //On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms.
        algorithm = countlyConfig.encryption.algorithm || "aes-256-cbc";
    }
    if(typeof input_encoding === "undefined"){
        input_encoding = countlyConfig.encryption.output_encoding || "hex";
    }
    if(typeof output_encoding === "undefined"){
        output_encoding = countlyConfig.encryption.input_encoding || "utf-8";
    }
    if(iv)
        decipher = crypto.createDecipheriv(algorithm, key, iv);
    else
        decipher = crypto.createDecipher(algorithm, key);
    decrypted = decipher.update(crypted, input_encoding, output_encoding);
    decrypted += decipher.final(output_encoding);
    return decrypted;
};