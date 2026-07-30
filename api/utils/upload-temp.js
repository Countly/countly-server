/**
 * @module api/utils/upload-temp
 * @description Bounds what the formidable parse in api/api.js is allowed to
 * write to disk, and removes whatever it wrote that no handler consumed.
 *
 * api/api.js parses every POST body with formidable, before the request is
 * routed or authorized. formidable writes multipart parts and raw
 * application/octet-stream bodies to disk, so without a gate any POST carrying
 * such a body leaves a file behind - including requests to paths that no
 * handler serves. This module provides:
 *
 *  - parseOptions: formidable options that allow a file to be written only
 *    where a plugin declared that the path reads params.files
 *  - discardUploads: removal of the files a request left behind
 */

'use strict';

const fs = require('fs');

/**
 * Strip the query string and the installation subpath from a request url.
 * requestProcessor strips the subpath before routing, so it has to be stripped
 * here too or uploads would be refused on subdirectory installs.
 * @param {string} url - request url, query string included
 * @param {string} [installPath] - installation subpath (common.config.path)
 * @returns {string} the path as requestProcessor will see it
 */
function normalizePath(url, installPath) {
    let reqPath = (url || '').split('?')[0];

    if (installPath && installPath !== '/'
        && (reqPath === installPath || reqPath.indexOf(installPath + '/') === 0)) {
        reqPath = reqPath.substring(installPath.length) || '/';
    }

    //so that /i and /i/ are the same path
    if (reqPath.length > 1 && reqPath.charAt(reqPath.length - 1) === '/') {
        reqPath = reqPath.substring(0, reqPath.length - 1);
    }

    return reqPath;
}

/**
 * Find the declaration a plugin registered for this path, if any.
 *
 * Matching is exact: a declaration for /i must not let /i/anything through,
 * otherwise declaring the SDK write endpoint would reopen the whole /i tree.
 * @param {Array} uploadPaths - plugins.uploadPaths
 * @param {string} reqPath - normalized request path
 * @returns {object|null} the declaration, or null when uploads are not allowed
 */
function findDeclaration(uploadPaths, reqPath) {
    if (!Array.isArray(uploadPaths) || !reqPath) {
        return null;
    }

    for (let i = 0; i < uploadPaths.length; i++) {
        const entry = uploadPaths[i];
        const declared = (typeof entry === 'string') ? entry : (entry && entry.path);
        if (declared && declared === reqPath) {
            return (typeof entry === 'string') ? {path: entry} : entry;
        }
    }

    return null;
}

/**
 * formidable options restricting what this request may write to disk.
 *
 * Returns the options to merge into the IncomingForm options: an empty object
 * where uploads are expected, and otherwise the entries that suppress them.
 * Both suppressions are needed and cover different parsers - `filter` is only
 * consulted for multipart parts, while formidable's octetstream plugin creates
 * its file directly via _newFile() and never calls `filter`, so the only way to
 * stop a raw body reaching disk is to leave that plugin out.
 *
 * The remaining parsers are kept enabled either way, so urlencoded and json
 * bodies still populate params.qstring exactly as before.
 * @param {string} url - request url, query string included
 * @param {string} [installPath] - installation subpath (common.config.path)
 * @param {Array} [uploadPaths] - plugins.uploadPaths, the declared upload paths
 * @returns {object} options to merge into the IncomingForm options
 */
function parseOptions(url, installPath, uploadPaths) {
    const declaration = findDeclaration(uploadPaths, normalizePath(url, installPath));
    const options = {};

    if (!declaration) {
        options.filter = function() {
            return false;
        };
    }

    if (!declaration || !declaration.raw) {
        options.enabledPlugins = ['querystring', 'multipart', 'json'];
    }

    return options;
}

/**
 * Record the paths formidable produced for this request, so they can be removed
 * later without trusting params.files.
 *
 * The snapshot is taken before any handler runs, because a handler may repoint
 * params.files[x].path at something else entirely - crash_symbolication points
 * it at files shipped with the plugin when serving populator data, which must
 * never be deleted.
 * @param {object} params - request params
 * @param {object} files - the files formidable parsed
 * @returns {void}
 */
function trackUploads(params, files) {
    const tracked = [];

    Object.keys(files || {}).forEach((key) => {
        const file = files[key];
        const target = file && (file.filepath || file.path);
        if (target) {
            tracked.push(target);
        }
    });

    params.uploadTempPaths = tracked;
}

/**
 * Remove the files formidable wrote for this request.
 *
 * Handlers that consume an upload unlink it themselves, so in the normal case
 * these are already gone and the unlink is a no-op. What is left is every
 * request that was rejected before reaching a handler at all, which is not
 * enumerable at the rejection sites - rights.js alone rejects in 63 places.
 *
 * Only the snapshot from trackUploads is touched, never params.files, so a
 * handler substituting a path cannot redirect this at another file.
 * @param {object} params - request params
 * @returns {void}
 */
function discardUploads(params) {
    if (!params || !params.uploadTempPaths || !params.uploadTempPaths.length) {
        return;
    }

    params.uploadTempPaths.forEach((target) => {
        fs.unlink(target, function() {});
    });
    params.uploadTempPaths = [];
}

module.exports = {
    parseOptions,
    trackUploads,
    discardUploads
};
