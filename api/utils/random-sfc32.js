/**
* Module for 32-bit Random Number Generation between [0, 1)
* @module api/utils/random-sfc32
*/

var crypto = require('crypto');

/**
 * Function that returns random number generator
 * @param  {String} key - Seed value for the RNG
 * @returns {Function} - Returns prng instance
 */
var random = function(key) {
    /**
     * Seed generation using Fowler–Noll–Vo hash function - FNV-1a hash
     * FNV (Fowler/Noll/Vo) is a fast, non-cryptographic hash algorithm with good dispersion.
     * http://papa.bretmulvey.com/post/124027987928/hash-functions
     * @param  {string} str - Salt value
     * @returns {Function} - Seed sramble function
     */
    function xfnv1a(str) {
        for (var i = 0, h = 2166136261 >>> 0; i < str.length; i++) {
            // Math.imul() allows for 32-bit integer multiplication with C-like semantics
            h = Math.imul(h ^ str.charCodeAt(i), 16777619);
        }

        return function() {
            h += h << 13;
            h ^= h >>> 7;
            h += h << 3;
            h ^= h >>> 17;
            return (h += h << 5) >>> 0;
        };
    }

    /**
     * PRNG - sfc32 - Recommended by PRACTRAND
     * This comes from the PractRand random number testing suite, of which it passes without issue.
     * https://github.com/MartyMacGyver/PractRand/blob/master/src/RNGs/sfc.cpp
     * @param  {Number} a - scrambled seed no
     * @param  {Number} b - scrambled seed no
     * @param  {Number} c - scrambled seed no
     * @param  {Number} d - scrambled seed no
     * @returns {Number} - Random number between 0 - 1
     */
    function sfc32(a, b, c, d) {
        return function() {
            a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
            var t = (a + b) | 0;
            a = b ^ b >>> 9;
            b = c + (c << 3) | 0;
            c = (c << 21 | c >>> 11);
            d = d + 1 | 0;
            t = t + d | 0;
            c = c + t | 0;
            return (t >>> 0) / 4294967296;
        };
    }

    if (!key) {
        // If key not provided, generate key using crypto random bytes
        key = crypto.randomBytes(64).toString("hex");
    }

    var seed = xfnv1a(key);

    return sfc32(seed(), seed(), seed(), seed());
};

module.exports = random;