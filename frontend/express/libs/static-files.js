/**
 * Tells whether a request is for a file the dashboard serves as a static asset,
 * so the dashboard rate limiter can leave those requests out of its count.
 * @module frontend/express/libs/static-files
 */

var fs = require('fs');
var path = require('path');

/**
 * Check that a request path points at a regular file inside a directory
 * @param {string} root - absolute directory the file must be in
 * @param {string} relative - request path relative to that directory, starting with "/"
 * @returns {Promise<boolean>} true if the file exists inside root
 */
function isFileIn(root, relative) {
    var full = path.resolve(root, "." + relative);
    if (full.indexOf(root + path.sep) !== 0) {
        return Promise.resolve(false);
    }
    return fs.promises.stat(full).then(function(stat) {
        return stat.isFile();
    }, function() {
        return false;
    });
}

/**
 * Create a matcher for the files express.static serves: the core public
 * directory mounted at the base path, and each plugin's frontend/public
 * directory mounted at the base path plus the plugin name.
 * @param {object} options - matcher options
 * @param {string} options.basePath - the dashboard path prefix, "" when served at the root
 * @param {string} options.coreRoot - the core public directory
 * @param {string} options.pluginsRoot - the directory holding the plugins
 * @returns {Function} function taking an express request and resolving to true for a static file
 */
function createStaticFileMatcher(options) {
    var basePath = options.basePath || "";
    var coreRoot = path.resolve(options.coreRoot);
    var pluginsRoot = path.resolve(options.pluginsRoot);

    return function(req) {
        if (req.method !== "GET" && req.method !== "HEAD") {
            return Promise.resolve(false);
        }
        var urlPath = req.path;
        if (basePath) {
            if (urlPath.indexOf(basePath + "/") !== 0) {
                return Promise.resolve(false);
            }
            urlPath = urlPath.slice(basePath.length);
        }
        try {
            urlPath = decodeURIComponent(urlPath);
        }
        catch {
            return Promise.resolve(false);
        }
        var segments = urlPath.split("/");
        // express.static does not serve dot files, and no static path needs "." or ".."
        if (urlPath.indexOf("\0") !== -1 || segments.some(function(segment) {
            return segment.charAt(0) === ".";
        })) {
            return Promise.resolve(false);
        }
        return isFileIn(coreRoot, urlPath).then(function(found) {
            if (found || segments.length < 3 || !segments[1]) {
                return found;
            }
            return isFileIn(path.join(pluginsRoot, segments[1], "frontend", "public"), "/" + segments.slice(2).join("/"));
        });
    };
}

module.exports = {
    createStaticFileMatcher: createStaticFileMatcher
};
