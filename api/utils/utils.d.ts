/**
 * Module for some common utility functions that needs to be separated from {@link module:api/utils/common} either due to circular references or other reasons
 * @module api/utils/utils
 */

import * as crypto from "crypto";
import { countlyConfig } from "./../config";

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
export function encrypt(
  text: string,
  key?: string,
  iv?: Buffer,
  algorithm?: string,
  input_encoding?: BufferEncoding,
  output_encoding?: crypto.BinaryToTextEncoding
): string;

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
export function decrypt(
  crypted: string,
  key?: string,
  iv?: Buffer,
  algorithm?: string,
  input_encoding?: crypto.BinaryToTextEncoding,
  output_encoding?: BufferEncoding
): string;

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
export function decrypt_old(
  crypted: string,
  key?: string,
  iv?: Buffer,
  algorithm?: string,
  input_encoding?: crypto.BinaryToTextEncoding,
  output_encoding?: BufferEncoding
): string;
