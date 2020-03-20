var path = require('path');

/**
 * Resolves the given relative path to absolute from Countly repository root path.
 * @param {string} relativePath The path relative to Countly root directory.
 * @returns {string} The absolute path resolved for the given relative path.
 */
function fromCountlyRoot(relativePath) {
    return path.join(__dirname, '../../../', relativePath);
}

module.exports = fromCountlyRoot;
