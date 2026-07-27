/**
 * @module api/utils/upload-temp
 * @description Bounds what the formidable parse in api/api.js is allowed to
 * write to disk, and removes what it wrote when the request is rejected before
 * any handler could claim it.
 *
 * api/api.js parses every POST body with formidable, before the request is
 * routed or authorized. formidable writes multipart parts and raw
 * application/octet-stream bodies to disk, so without a gate any POST carrying
 * such a body leaves a file behind - including requests to paths that no
 * handler serves. This module provides:
 *
 *  - parseOptions: formidable options that allow a file to be written only
 *    where an endpoint actually consumes one
 *  - resolveUploadDir: a dedicated directory, so temp uploads are attributable
 *    and separable from unrelated files in the OS temp directory
 *  - discardUploads: removal at the points where a request is rejected before
 *    dispatch, where nothing can be mid-read
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Name of the directory created inside the OS temp directory when no explicit
 * uploadDir is configured.
 */
const DEFAULT_DIR_NAME = 'countly-uploads';

/**
 * Directory the temp files are expected to live in. Used to make sure
 * discardUploads only ever removes a file formidable itself created.
 */
let effectiveDir = os.tmpdir();

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
 * Resolve, creating it if needed, the directory formidable writes upload temp
 * files into. Falls back to formidable's own default rather than failing
 * uploads if the directory cannot be created.
 * @param {object} apiConfig - countlyConfig.api
 * @returns {string|undefined} directory path, or undefined to keep the default
 */
function resolveUploadDir(apiConfig) {
    const dir = (apiConfig && apiConfig.uploadDir) || path.join(os.tmpdir(), DEFAULT_DIR_NAME);
    try {
        fs.mkdirSync(dir, {recursive: true});
        effectiveDir = dir;
        return dir;
    }
    catch (ex) {
        effectiveDir = os.tmpdir();
        return undefined;
    }
}

/**
 * Remove the temp files formidable created for a request.
 *
 * Only safe to call where the request is rejected before it is dispatched, so
 * that no handler can be reading the file: some handlers keep using their temp
 * file after responding, so this must never be wired to response teardown.
 *
 * Only files directly inside the upload directory are removed. A handler may
 * repoint params.files[x].path at something else entirely - crash_symbolication
 * points it at files shipped with the plugin when serving populator data - and
 * those must never be deleted.
 * @param {object} params - request params carrying files
 * @returns {void}
 */
function discardUploads(params) {
    if (!params || !params.files) {
        return;
    }

    Object.keys(params.files).forEach((key) => {
        const file = params.files[key];
        const target = file && (file.path || file.filepath);
        if (target && path.dirname(target) === effectiveDir) {
            fs.unlink(target, function() {});
        }
    });
}

module.exports = {
    parseOptions,
    resolveUploadDir,
    discardUploads
};
