/**
 * Module for cryptography and security utility functions
 * @module api/utils/common/crypto-utils
 */

declare module "api/utils/common/crypto-utils" {
  import { BinaryToTextEncoding } from "crypto";

  /**
   * Create HMAC sha1 hash from provided value and optional salt
   * @param {string} str - value to hash
   * @param {string=} addSalt - optional salt, uses ms timestamp by default
   * @returns {string} HMAC sha1 hash
   */
  export function sha1Hash(str: string, addSalt?: string): string;

  /**
   * Create HMAC sha512 hash from provided value and optional salt
   * @param {string} str - value to hash
   * @param {string=} addSalt - optional salt, uses ms timestamp by default
   * @returns {string} HMAC sha1 hash
   */
  export function sha512Hash(str: string, addSalt?: string): string;

  /**
   * Create argon2 hash string
   * @param {string} str - string to hash
   * @returns {promise} hash promise
   **/
  export function argon2Hash(str: string): Promise<string>;

  /**
   * Create MD5 hash from provided value
   * @param {string} str - value to hash
   * @returns {string} MD5 hash
   */
  export function md5Hash(str: string): string;

  /**
   * Shuffle string using getRandomValues
   * @param {string} text - text to be shuffled
   * @returns {string} shuffled password
   */
  export function shuffleString(text: string): string;

  /**
   * Gets a random string from given character set string with given length
   * @param {string} charSet - charSet string
   * @param {number} length - length of the random string. default 1
   * @returns {string} random string from charset
   */
  export function getRandomValue(charSet: string, length?: number): string;

  /**
   * Generate random password
   * @param {number} length - length of the password
   * @param {boolean} no_special - do not include special characters
   * @returns {string} password
   * @example
   * //outputs 4UBHvRBG1v
   * generatePassword(10, true);
   */
  export function generatePassword(
    length: number,
    no_special?: boolean
  ): string;
}
