/**
 * Module for 32-bit Random Number Generation between [0, 1)
 * @module api/utils/random-sfc32
 */

import * as crypto from "crypto";

/**
 * Random number generator function that returns a number between 0 and 1
 */
export type RandomNumberGenerator = () => number;

/**
 * Seed scramble function used internally
 */
export type SeedScrambleFunction = () => number;

/**
 * Function that returns random number generator
 * @param key - Seed value for the RNG. If not provided, a random key will be generated using crypto.randomBytes
 * @returns Returns prng instance that generates random numbers between 0 and 1
 */
declare function random(key?: string): RandomNumberGenerator;

export = random;
