/**
 * js-deep-equals - ES Module version
 * Compares objects/arrays regardless of key/element order using murmur hash
 * @module js-deep-equals
 */

/**
 * MurmurHash v3 implementation for generating 32-bit hash values.
 * This is a non-cryptographic hash function suitable for hash-based lookups.
 * 
 * @param {string} str - The input string to hash
 * @param {number} [seed=0] - Optional seed value for the hash function
 * @returns {number} A 32-bit unsigned integer hash value
 */
function murmurhash3(str, seed = 0) {
    let c1 = 3432918353;
    let c2 = 461845907;
    let h1 = seed;
    let k1;

    const remainder = str.length & 3;
    const bytes = str.length - remainder;

    let i = 0;
    while (i < bytes) {
        k1 = (str.charCodeAt(i) & 0xff) |
             ((str.charCodeAt(++i) & 0xff) << 8) |
             ((str.charCodeAt(++i) & 0xff) << 16) |
             ((str.charCodeAt(++i) & 0xff) << 24);
        ++i;

        k1 = ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;

        h1 ^= k1;
        h1 = (h1 << 13) | (h1 >>> 19);
        const h1b = ((h1 & 0xffff) * 5 + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff;
        h1 = (h1b & 0xffff) + 0x6b64 + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16);
    }

    k1 = 0;
    switch (remainder) {
    case 3:
        k1 ^= (str.charCodeAt(i + 2) & 0xff) << 16;
        // falls through
    case 2:
        k1 ^= (str.charCodeAt(i + 1) & 0xff) << 8;
        // falls through
    case 1:
        k1 ^= str.charCodeAt(i) & 0xff;
        k1 = ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
        k1 = (k1 << 15) | (k1 >>> 17);
        k1 = ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
        h1 ^= k1;
    }

    h1 ^= str.length;
    h1 ^= h1 >>> 16;
    h1 = ((h1 & 0xffff) * 0x85ebca6b + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 13;
    h1 = ((h1 & 0xffff) * 0xc2b2ae35 + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) & 0xffffffff;
    h1 ^= h1 >>> 16;

    return h1 >>> 0;
}

/**
 * Node class for building a hash tree structure.
 * Each node contains child nodes and a computed hash value.
 * 
 * @class
 */
class HashNode {
    /**
     * Creates a new HashNode instance.
     * Initializes with an empty children array and hash value of 0.
     */
    constructor() {
        /** @type {HashNode[]} Array of child HashNode instances */
        this.children = [];
        /** @type {number} The computed hash value for this node */
        this.hash = 0;
    }
}

/**
 * Generates a hash for a primitive value with an optional prefix.
 * Combines the prefix, type, and value into a string before hashing.
 * 
 * @param {*} value - The primitive value to hash
 * @param {string} [prefix=""] - Optional prefix to include in the hash computation
 * @returns {number} A 32-bit unsigned integer hash value
 */
function hashPrimitive(value, prefix = "") {
    const str = prefix + typeof value + "::" + value;
    return murmurhash3(str);
}

/**
 * Reducer function to sum hash values from nodes.
 * Used to combine child node hashes in an order-independent manner.
 * 
 * @param {number} acc - The accumulated hash value
 * @param {HashNode} node - The current node whose hash to add
 * @returns {number} The combined hash value, masked to 32 bits
 */
function reduceHash(acc, node) {
    return (acc + node.hash) & 0xffffffff;
}

/**
 * Creates a leaf node with a computed hash for a primitive value.
 * 
 * @param {*} value - The primitive value to create a leaf for
 * @param {string} prefix - The prefix to include in the hash computation
 * @returns {HashNode} A new HashNode with the computed hash
 */
function createLeaf(value, prefix) {
    const node = new HashNode();
    node.hash = hashPrimitive(value, prefix);
    return node;
}

/**
 * Recursively builds a hash tree from a value.
 * Handles primitives, arrays, objects, Date, and RegExp instances.
 * The resulting tree's hash is order-independent for arrays due to additive combination.
 * 
 * @param {HashNode} node - The current node being built
 * @param {*} value - The value to build the tree from
 * @param {string} [prefix=""] - Optional prefix for hash computation (used for object keys)
 * @returns {HashNode} The built HashNode with computed hash
 */
function buildTree(node, value, prefix = "") {
    const isObject = typeof value === "object";
    const isArray = Array.isArray(value);
    const keys = value === null || value === undefined ? [] : Object.keys(value);

    // Handle Date and RegExp as primitives
    if (value instanceof Date || value instanceof RegExp) {
        return createLeaf(value, prefix);
    }

    // Handle primitives
    if (!isObject && !isArray) {
        return createLeaf(value, prefix);
    }

    // Handle empty arrays/objects
    if (!keys.length) {
        return isArray ? createLeaf("__empty__arr", prefix) : createLeaf("__empty__obj", prefix);
    }

    // Process children
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        let childPrefix;

        // For objects (not arrays), include key in prefix
        if (!isArray && isObject) {
            childPrefix = key;
        }

        const child = buildTree(new HashNode(), value[key], childPrefix);
        node.children.push(child);
    }

    // Combine children hashes (order-independent due to addition)
    const combinedHash = node.children.reduce(reduceHash, 0);
    node.hash = hashPrimitive(combinedHash, prefix);

    return node;
}

/**
 * Generates an order-independent hash for a value.
 * Arrays with the same elements in different orders will produce the same hash.
 * Objects with the same key-value pairs will produce the same hash regardless of key order.
 * 
 * @param {*} value - The value to hash (can be primitive, array, or object)
 * @returns {number} A 32-bit unsigned integer hash value
 * @example
 * // Arrays with same elements in different order produce same hash
 * hashUnsorted([1, 2, 3]) === hashUnsorted([3, 1, 2]) // true
 * 
 * @example
 * // Objects with same properties produce same hash
 * hashUnsorted({a: 1, b: 2}) === hashUnsorted({b: 2, a: 1}) // true
 */
function hashUnsorted(value) {
    const tree = buildTree(new HashNode(), value);
    return tree.hash;
}

/**
 * Compares two values for equality in an order-independent manner.
 * Arrays are considered equal if they contain the same elements regardless of order.
 * Objects are considered equal if they have the same key-value pairs regardless of key order.
 * 
 * @param {Array|Object} a - The first value to compare
 * @param {Array|Object} b - The second value to compare
 * @returns {boolean} True if the values are equal (order-independent), false otherwise
 * @example
 * // Compare arrays with different order
 * compareUnsorted([1, 2, 3], [3, 2, 1]) // true
 * 
 * @example
 * // Compare objects
 * compareUnsorted({a: 1, b: 2}, {b: 2, a: 1}) // true
 * 
 * @example
 * // Different values return false
 * compareUnsorted([1, 2], [1, 3]) // false
 */
function compareUnsorted(a, b) {
    // Both must exist
    if (!a || !b) {
        return false;
    }

    // Both must be same type (array or object)
    const aIsArray = Array.isArray(a);
    const bIsArray = Array.isArray(b);
    const aIsObject = typeof a === "object";
    const bIsObject = typeof b === "object";

    if (!((aIsArray && bIsArray) || (aIsObject && bIsObject))) {
        return false;
    }

    // Must have same length
    if (a.length !== b.length) {
        return false;
    }

    // Compare hashes
    return hashUnsorted(a) === hashUnsorted(b);
}

// Named exports
export { compareUnsorted, hashUnsorted };

// Default export
export default {
    compareUnsorted,
    hashUnsorted
};