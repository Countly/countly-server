/**
 * Loads the isolated-vm build that matches the running Node.js.
 *
 * isolated-vm is a native addon tied to one V8 version. 5.x builds for Node.js 20 (and 22),
 * which 25.03 installs before 25.03.58 still run; 6.x builds for Node.js 22 (and 24) but not
 * for 26, whose V8 removed APIs it uses; 7.x supports Node.js 24 and later only. The hooks
 * plugin declares all three as optional dependencies (isolated-vm-5, -6, -7), so npm installs
 * whichever build here and skips the rest, and this picks the one meant for this Node.js,
 * falling back to the others if one of those is what installed. Last comes plain
 * isolated-vm, the name node_modules installed before the versioned names still carry.
 */
const log = require('../../../../api/utils/log.js')('hooks:isolated-vm');

/**
 * Package names to try, best match first, for a Node.js version
 * @param {string} nodeVersion - Node.js version, as in process.versions.node
 * @returns {string[]} package names
 */
function candidates(nodeVersion) {
    const major = parseInt(nodeVersion, 10);
    let versioned;
    if (major >= 24) {
        versioned = ['isolated-vm-7', 'isolated-vm-6', 'isolated-vm-5'];
    }
    else if (major >= 22) {
        versioned = ['isolated-vm-6', 'isolated-vm-7', 'isolated-vm-5'];
    }
    else {
        versioned = ['isolated-vm-5', 'isolated-vm-6', 'isolated-vm-7'];
    }
    return versioned.concat('isolated-vm');
}

let loaded = null;

/**
 * Load isolated-vm for this Node.js, once
 * @param {Function} [requireFn] - require to use, for tests
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
