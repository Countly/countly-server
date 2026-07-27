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
 * Every endpoint that consumes params.files lives under /i, so a multipart file
 * is only ever useful there. Nothing under /o accepts an upload.
 */
const MULTIPART_ROOT = /^\/i(\/|$)/;

/**
 * Raw application/octet-stream bodies are only consumed by symbol uploads,
 * which is also why api/api.js buffers those requests differently. Everywhere
 * else an octet-stream body is never read as a file, so it must not create one.
 */
const RAW_UPLOAD_PATHS = /^\/i\/crash_symbols\/(add_symbol|upload_symbol|edit_symbol)(\/|$)/;

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

    return reqPath;
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
 * @returns {object} options to merge into the IncomingForm options
 */
function parseOptions(url, installPath) {
    const reqPath = normalizePath(url, installPath);
    const options = {};

    if (!MULTIPART_ROOT.test(reqPath)) {
        options.filter = function() {
            return false;
        };
    }

    if (!RAW_UPLOAD_PATHS.test(reqPath)) {
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
