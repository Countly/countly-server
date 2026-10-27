/**
 * Loads the isolated-vm build that matches the running Node.js.
 *
 * isolated-vm is a native addon tied to one V8 version. 6.x builds for Node.js 22 (and 24)
 * but not for 26, whose V8 removed APIs it uses; 7.x supports Node.js 24 and later only.
 * The hooks plugin declares both as optional dependencies (isolated-vm-6, isolated-vm-7),
 * so npm installs whichever builds here and skips the other, and this picks the one meant
 * for this Node.js, falling back to the other if that is the one that installed.
 */
const log = require('../../../../api/utils/log.js')('hooks:isolated-vm');

/**
 * Package names to try, best match first, for a Node.js version
 * @param {string} nodeVersion - Node.js version, as in process.versions.node
 * @returns {string[]} package names
 */
function candidates(nodeVersion) {
    return parseInt(nodeVersion, 10) >= 24 ? ['isolated-vm-7', 'isolated-vm-6'] : ['isolated-vm-6', 'isolated-vm-7'];
}

let loaded = null;

/**
 * Load isolated-vm for this Node.js, once
 * @param {function} [requireFn] - require to use, for tests
 * @param {string} [nodeVersion] - Node.js version, for tests
 * @returns {object} the isolated-vm module
 */
function load(requireFn = require, nodeVersion = process.versions.node) {
    if (loaded && requireFn === require) {
        return loaded;
    }
    const errors = [];
    for (const name of candidates(nodeVersion)) {
        try {
            const ivm = requireFn(name);
            if (requireFn === require) {
                loaded = ivm;
            }
            return ivm;
        }
        catch (err) {
            errors.push(name + ': ' + err.message);
        }
    }
    const error = new Error('No isolated-vm build loads on Node.js ' + nodeVersion + ' (' + errors.join('; ') + ')');
    log.e(error.message);
    throw error;
}

module.exports = { load, candidates };
