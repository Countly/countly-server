/**
 * Module for 32-bit Random Number Generation between [0, 1)
 * @module api/utils/random-sfc32
 */

import crypto from 'crypto';

/**
 * Type for a seeded random number generator function
 */
type PRNG = () => number;

/**
 * Type for a seed scramble function
 */
type SeedScrambler = () => number;

/**
 * Function that returns random number generator
 * @param key - Seed value for the RNG
 * @returns Returns prng instance
 */
function random(key?: string): PRNG {
    /**
     * Seed generation using Fowler–Noll–Vo hash function - FNV-1a hash
     * FNV (Fowler/Noll/Vo) is a fast, non-cryptographic hash algorithm with good dispersion.
     * http://papa.bretmulvey.com/post/124027987928/hash-functions
     * @param str - Salt value
     * @returns Seed scramble function
     */
    function xfnv1a(str: string): SeedScrambler {
        let h = 2166136261 >>> 0;
        for (let i = 0; i < str.length; i++) {
            // Math.imul() allows for 32-bit integer multiplication with C-like semantics
            h = Math.imul(h ^ str.charCodeAt(i), 16777619);
        }

        return function(): number {
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
     * @param a - scrambled seed no
     * @param b - scrambled seed no
     * @param c - scrambled seed no
     * @param d - scrambled seed no
     * @returns Random number between 0 - 1
     */
    function sfc32(a: number, b: number, c: number, d: number): PRNG {
        return function(): number {
            a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
            let t = (a + b) | 0;
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

    const seed = xfnv1a(key);

    return sfc32(seed(), seed(), seed(), seed());
}

export default random;
