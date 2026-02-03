/**
 * Module for some common utility functions that needs to be separated from {@link module:api/utils/common} either due to circular references or other reasons
 * @module api/utils/utils
 */
import crypto from 'crypto';
import { createRequire } from 'module';

// @ts-expect-error - import.meta is available at runtime with Node's native TypeScript support
const require = createRequire(import.meta.url);

interface EncryptionConfig {
    key?: string;
    iv?: Buffer;
    algorithm?: string;
    input_encoding?: BufferEncoding;
    output_encoding?: BufferEncoding;
}

interface CountlyConfig {
    encryption?: EncryptionConfig;
    [key: string]: unknown;
}

const countlyConfig: CountlyConfig = require('./../config.js') as CountlyConfig;

if (!countlyConfig.encryption) {
    countlyConfig.encryption = {};
}

/**
 * Encrypt provided value
 * @param text - value to encrypt
 * @param key - key used for encryption and decryption
 * @param iv - initialization vector to make encryption more secure
 * @param algorithm - name of the algorithm to use for encryption. The algorithm is dependent on OpenSSL, examples are 'aes192', etc. On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms. Default value is aes-256-cbc
 * @param input_encoding - how encryption input is encoded. Used as output for decrypting. Default utf-8.
 * @param output_encoding - how encryption output is encoded. Used as input for decrypting. Default hex.
 * @returns encrypted value
 */
function encrypt(
    text: string,
    key?: string,
    iv?: Buffer,
    algorithm?: string,
    input_encoding?: BufferEncoding,
    output_encoding?: BufferEncoding
): string {
    if (key === undefined) {
        key = countlyConfig.encryption?.key || 'dpYheF85';
    }

    // pad or shrink to 32 bytes
    const keyBuffer = Buffer.concat([Buffer.from(key), Buffer.alloc(32)], 32);

    if (iv === undefined) {
        iv = crypto.randomBytes(16);
    }
    if (algorithm === undefined) {
        // The algorithm is dependent on OpenSSL, examples are 'aes192', etc.
        // On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms.
        algorithm = countlyConfig.encryption?.algorithm || 'aes-256-cbc';
    }
    if (input_encoding === undefined) {
        input_encoding = (countlyConfig.encryption?.input_encoding as BufferEncoding) || 'utf-8';
    }
    if (output_encoding === undefined) {
        output_encoding = (countlyConfig.encryption?.output_encoding as BufferEncoding) || 'hex';
    }
    const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
    let crypted = cipher.update(text, input_encoding, output_encoding);
    crypted += cipher.final(output_encoding);
    return iv.toString('hex') + ':' + crypted + '[CLY]_true';
}

/**
 * Decrypt provided value
 * @param crypted - value to decrypt
 * @param key - key used for encryption and decryption
 * @param iv - initialization vector used in encryption
 * @param algorithm - name of the algorithm used in encryption. The algorithm is dependent on OpenSSL, examples are 'aes192', etc. On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms. Default value is aes-256-cbc
 * @param input_encoding - how decryption input is encoded. Default hex.
 * @param output_encoding - how decryption output is encoded. Default utf-8.
 * @returns decrypted value
 */
function decrypt(
    crypted: string | null | undefined,
    key?: string,
    iv?: Buffer,
    algorithm?: string,
    input_encoding?: BufferEncoding,
    output_encoding?: BufferEncoding
): string | null | undefined {
    if (!crypted || crypted.length === 0 || typeof crypted !== 'string') {
        return crypted;
    }

    if (!crypted.includes(':')) {
        return decrypt_old(crypted, key, iv, algorithm, input_encoding, output_encoding);
    }

    if (!crypted.includes('[CLY]_true') || crypted.lastIndexOf('[CLY]_true') !== crypted.length - 10) {
        return crypted;
    }
    else {
        crypted = crypted.substring(0, crypted.length - 10);
    }

    const parts = crypted.split(':');
    const ivPart = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');

    if (key === undefined) {
        key = countlyConfig.encryption?.key || 'dpYheF85';
    }

    // pad or shrink to 32 bytes
    const keyBuffer = Buffer.concat([Buffer.from(key), Buffer.alloc(32)], 32);

    if (iv === undefined) {
        iv = countlyConfig.encryption?.iv || ivPart;
    }
    if (algorithm === undefined) {
        // The algorithm is dependent on OpenSSL, examples are 'aes192', etc.
        // On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms.
        algorithm = countlyConfig.encryption?.algorithm || 'aes-256-cbc';
    }
    if (input_encoding === undefined) {
        input_encoding = (countlyConfig.encryption?.output_encoding as BufferEncoding) || 'hex';
    }
    if (output_encoding === undefined) {
        output_encoding = (countlyConfig.encryption?.input_encoding as BufferEncoding) || 'utf-8';
    }

    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);

    // When input is a Buffer, we don't use input_encoding
    let decrypted = decipher.update(encryptedText).toString(output_encoding);
    decrypted += decipher.final(output_encoding);
    return decrypted;
}

/**
 * Old deprecated decrypt function, needed for old stored values
 * @param crypted - value to decrypt
 * @param key - key used for encryption and decryption
 * @param iv - initialization vector used in encryption
 * @param algorithm - name of the algorithm used in encryption. The algorithm is dependent on OpenSSL, examples are 'aes192', etc. On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms. Default value is aes-256-cbc
 * @param input_encoding - how decryption input is encoded. Default hex.
 * @param output_encoding - how decryption output is encoded. Default utf-8.
 * @returns decrypted value
 */
function decrypt_old(
    crypted: string | null | undefined,
    key?: string,
    iv?: Buffer,
    algorithm?: string,
    input_encoding?: BufferEncoding,
    output_encoding?: BufferEncoding
): string | null | undefined {
    if (!crypted || crypted.length === 0 || typeof crypted !== 'string') {
        return crypted;
    }
    if (!crypted.includes('[CLY]_true') || crypted.lastIndexOf('[CLY]_true') !== crypted.length - 10) {
        return crypted;
    }
    else {
        crypted = crypted.substring(0, crypted.length - 10);
    }

    if (key === undefined) {
        key = countlyConfig.encryption?.key || 'dpYheF85';
    }
    if (iv === undefined) {
        iv = countlyConfig.encryption?.iv;
    }
    if (algorithm === undefined) {
        // The algorithm is dependent on OpenSSL, examples are 'aes192', etc.
        // On recent OpenSSL releases, openssl list-cipher-algorithms will display the available cipher algorithms.
        algorithm = countlyConfig.encryption?.algorithm || 'aes-256-cbc';
    }
    if (input_encoding === undefined) {
        input_encoding = (countlyConfig.encryption?.output_encoding as BufferEncoding) || 'hex';
    }
    if (output_encoding === undefined) {
        output_encoding = (countlyConfig.encryption?.input_encoding as BufferEncoding) || 'utf-8';
    }

    let decrypted: string;
    if (iv) {
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decrypted = decipher.update(crypted, input_encoding, output_encoding);
        decrypted += decipher.final(output_encoding);
    }
    else {
        // @ts-expect-error - createDecipher is deprecated but needed for old values
        const decipher = crypto.createDecipher(algorithm, key);
        decrypted = decipher.update(crypted, input_encoding, output_encoding);
        decrypted += decipher.final(output_encoding);
    }
    return decrypted;
}

export { encrypt, decrypt, decrypt_old };
