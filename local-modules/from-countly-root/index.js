var fs = require('fs');
var path = require('path');

var REFERENCE_FILE_NAME = 'package.json';
var REFERENCE_PROJECT_NAME = 'countly-server';

/**
 * Find a file from a base directory by walking up the hierarchy.
 * @param {string} root The reference path to start lookup from.
 * @param {string} fileToSearch The name of the file to search.
 * @returns {string} The path where the file to search as been found.
 */
function findReferenceFile(root, fileToSearch) {
    var prevRoot;

    do {
        var filename = path.join(root, fileToSearch);
        if (fs.existsSync(filename) && fs.statSync(filename).isFile()) {
            return root;
        }
        prevRoot = root;
        root = path.dirname(root);
    } while (prevRoot !== root);

    return null;
}

/**
 * Get the project name from a package.json file.
 * @param {string} jsonFilename The package.json full filename.
 * @returns {string} The name of the package (property "name" of the package.json).
 */
function getProjectName(jsonFilename) {
    try {
        return JSON.parse(fs.readFileSync(jsonFilename)).name;
    }
    catch (error) {
        return null;
    }
}

/**
 * Find the path that contains a file REFERENCE_FILE_NAME with
 * project name REFERENCE_PROJECT_NAME, from __dirname path.
 * @returns {string} The absolute path of Countly.
 */
function findReferencePath() {
    var basePath = __dirname;
    var asLongAsNeeded = true;

    while (asLongAsNeeded) {
        // Look-up for the closest reference file in the hierarchy.

        var referencePath = findReferenceFile(basePath, REFERENCE_FILE_NAME);

        if (!referencePath) {
            throw new Error('Imposible to find "' + REFERENCE_FILE_NAME + '" from "' + basePath + '"');
        }

        // Make sure this is the reference file we are looking for.

        var projectName = getProjectName(path.join(referencePath, REFERENCE_FILE_NAME));

        if (projectName === REFERENCE_PROJECT_NAME) {
            return referencePath;
        }

        // If not, keep looking up the hierarchy.

        basePath = path.dirname(referencePath);
    }
}

var referencePath = findReferencePath();

/**
 * Resolves the given relative path to absolute from Countly repository root path.
 * @param {string} relativePath The path relative to Countly root directory.
 * @returns {string} The absolute path resolved for the given relative path.
 */
function fromCountlyRoot(relativePath) {
    return path.join(referencePath, relativePath);
}

module.exports = fromCountlyRoot;
