/**
 * @module api/utils/upload-temp
 * @description Bounds the reach and lifetime of the temporary files formidable
 * creates while parsing POST bodies in api/api.js.
 *
 * api/api.js parses every POST body with formidable, before the request is
 * routed or authorized. formidable writes multipart parts and raw
 * application/octet-stream bodies to disk, so any POST carrying such a body
 * leaves a file behind - including requests that are never routed to a handler
 * at all. This module provides:
 *
 *  - acceptsFileUpload: whether a path can reach an upload handler in the first
 *    place, so bodies sent to unroutable paths are never written to disk
 *  - noFileWriteOptions: the formidable options that suppress those writes
 *  - resolveUploadDir: a dedicated directory, so temp uploads are attributable
 *    and separable from unrelated files in the OS temp directory
 *  - sweepStaleUploads: age based removal of files no request is using any more
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
 * Age at which an upload temp file is considered abandoned. Deliberately far
 * longer than any request can live (api.timeout defaults to 120s), so the sweep
 * cannot race a handler that is still using its file.
 */
const DEFAULT_MAX_AGE = 60 * 60 * 1000;

/**
 * How often the sweep runs.
 */
const SWEEP_INTERVAL = 15 * 60 * 1000;

/**
 * Whether a request path can legitimately carry a file upload.
 *
 * Countly routes API requests under /i and /o only (see requestProcessor), so a
 * POST to any other path can never reach a handler that consumes params.files.
 * Parsing such a body into a temp file only leaves data on disk that nothing
 * will ever claim.
 * @param {string} url - request url, query string included
 * @param {string} [installPath] - installation subpath (common.config.path), for
 * example "/countly" when Countly is served from a subdirectory
 * @returns {boolean} true when the path can carry an upload
 */
function acceptsFileUpload(url, installPath) {
    let reqPath = (url || '').split('?')[0];

    // requestProcessor strips the installation subpath before routing, so strip
    // it here too or uploads would be refused on subdirectory installs
    if (installPath && installPath !== '/'
        && (reqPath === installPath || reqPath.indexOf(installPath + '/') === 0)) {
        reqPath = reqPath.substring(installPath.length) || '/';
    }

    return (/^\/[io](\/|$)/).test(reqPath);
}

/**
 * formidable options that stop any part of the request body from reaching disk.
 *
 * Both entries are needed. `filter` is only consulted for multipart parts;
 * formidable's octetstream plugin creates its file directly and never calls it,
 * so a raw application/octet-stream body is written to disk regardless of
 * `filter`. Dropping that plugin leaves such requests without a parser, which
 * api/api.js already tolerates - it reports the usual response for the path.
 * @returns {object} options to merge into the IncomingForm options
 */
function noFileWriteOptions() {
    return {
        filter: function() {
            return false;
        },
        enabledPlugins: ['querystring', 'multipart', 'json']
    };
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
        return dir;
    }
    catch (ex) {
        return undefined;
    }
}

/**
 * Remove upload temp files that no request is using any more.
 *
 * Removal is age based on purpose. A handler that still needs its temp file is
 * inside a request that has not finished, and some handlers keep reading the
 * file after responding, so only files older than maxAge are touched. That
 * makes the sweep safe against in flight uploads while still reclaiming files
 * left by aborted, unrouted or rejected requests.
 * @param {string} dir - directory to sweep
 * @param {number} [maxAge=DEFAULT_MAX_AGE] - age in ms at which a file is removed
 * @param {function} [callback] - called with (err, removedCount)
 * @returns {void}
 */
function sweepStaleUploads(dir, maxAge, callback) {
    const cb = callback || function() {};
    const cutoff = Date.now() - (maxAge || DEFAULT_MAX_AGE);

    if (!dir) {
        return cb(null, 0);
    }

    fs.readdir(dir, (err, entries) => {
        if (err) {
            return cb(err);
        }
        if (!entries.length) {
            return cb(null, 0);
        }

        let pending = entries.length;
        let removed = 0;

        entries.forEach((entry) => {
            const target = path.join(dir, entry);
            fs.stat(target, (statErr, stat) => {
                if (statErr || !stat.isFile() || stat.mtimeMs > cutoff) {
                    if (!--pending) {
                        cb(null, removed);
                    }
                    return;
                }
                fs.unlink(target, (unlinkErr) => {
                    if (!unlinkErr) {
                        removed++;
                    }
                    if (!--pending) {
                        cb(null, removed);
                    }
                });
            });
        });
    });
}

module.exports = {
    acceptsFileUpload,
    noFileWriteOptions,
    resolveUploadDir,
    sweepStaleUploads,
    DEFAULT_MAX_AGE,
    SWEEP_INTERVAL
};
