var exported = {},
    countlyFs = require('../../../api/utils/countlyFs.js'),
    countlyConfig = require("../../../frontend/express/config"),
    common = require('../../../api/utils/common.js'),
    imageUtils = require('../api/image-utils.js');
var path = require('path');
var log = common.log('star-rating:frontend');

// Names accepted on the preview route. Tighter than the upload-side
// validator so even legacy data with unexpected ids can't be reached
// via path component shenanigans (no path separators, no dots).
var PREVIEW_NAME_RE = /^[a-zA-Z0-9_-]{1,64}$/;

// File extension → response Content-Type for /star-rating/images/*.
// Upload side restricts saved files to png/jpg/gif; .jpeg kept for any
// legacy data uploaded before that restriction was tightened.
var STAR_RATING_EXT_TO_MIME = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif"
};

(function(plugin) {
    plugin.init = function(app) {

        /**
         * Method that render ratings popup template
         * @param {*} req - Express request object
         * @param {*} res - Express response object
         */
        function renderPopup(req, res) {
            res.removeHeader('X-Frame-Options');
            res.render('../../../plugins/star-rating/frontend/public/templates/feedback-popup', {});
        }

        app.get(countlyConfig.path + '/feedback/rating', renderPopup);
        // keep this for backward compatability
        app.get(countlyConfig.path + '/feedback', renderPopup);
        app.get(countlyConfig.path + '/feedback/preview/*', function(req, res/*, next*/) {
            if (!req.params || !req.params[0] || req.params[0] === '' || !PREVIEW_NAME_RE.test(req.params[0])) {
                res.sendFile(__dirname + '/public/images/default_app_icon.png');
            }
            else {
                countlyFs.gridfs.getDataById("feedback", req.params[0], function(err, data) {
                    if (err || !data) {
                        res.sendFile(__dirname + '/public/images/default_app_icon.png');
                        return;
                    }
                    var commaIdx = data.indexOf(',');
                    if (commaIdx === -1) {
                        res.sendFile(__dirname + '/public/images/default_app_icon.png');
                        return;
                    }
                    var img;
                    try {
                        img = Buffer.from(data.slice(commaIdx + 1), 'base64');
                    }
                    catch (e) {
                        res.sendFile(__dirname + '/public/images/default_app_icon.png');
                        return;
                    }
                    // Re-derive Content-Type from sniffed bytes. Never trust
                    // the MIME embedded in the stored data URI.
                    var safeType = imageUtils.sniffImageType(img);
                    if (!safeType) {
                        res.sendFile(__dirname + '/public/images/default_app_icon.png');
                        return;
                    }
                    res.writeHead(200, {
                        'Content-Type': safeType,
                        'Content-Length': img.length,
                        'X-Content-Type-Options': 'nosniff',
                        'Content-Security-Policy': "sandbox; default-src 'none'",
                        'Content-Disposition': 'inline'
                    });
                    res.end(img);
                });
            }
        });
        app.get(countlyConfig.path + '/star-rating/images/*', function(req, res) {
            var imagePath = common.resolvePathInBase(path.resolve(__dirname, './../images'), req.params[0]);
            if (!imagePath) {
                res.sendFile(path.resolve(__dirname + './../../../frontend/express/public/images/default_app_icon.png'));
                return;
            }
            // Derive Content-Type from the requested filename extension.
            // Upload side guarantees the saved extension matches the
            // sniffed format; this just ensures the response Content-Type
            // matches the actual bytes (rather than always claiming png).
            var pathExt = (req.params[0].split(".").pop() || "").toLowerCase();
            var responseMime = STAR_RATING_EXT_TO_MIME[pathExt];
            if (!responseMime) {
                res.sendFile(path.resolve(__dirname + './../../../frontend/express/public/images/default_app_icon.png'));
                return;
            }
            countlyFs.getStats("star-rating", imagePath, {id: "" + req.params[0]}, function(statsErr, stats) {
                if (statsErr || !stats || !stats.size) {
                    res.sendFile(path.resolve(__dirname + './../../../frontend/express/public/images/default_app_icon.png'));
                }
                else {
                    countlyFs.getStream("star-rating", imagePath, {id: "" + req.params[0]}, function(streamErr, stream) {
                        if (streamErr || !stream) {
                            res.sendFile(path.resolve(__dirname + './../../../frontend/express/public/images/default_app_icon.png'));
                        }
                        else {
                            stream.on('error', function(error) {
                                log.e(error);
                                if (!res.headersSent) {
                                    res.sendFile(path.resolve(__dirname + './../../../frontend/express/public/images/default_app_icon.png'));
                                }
                                else {
                                    res.end();
                                }
                            });
                            res.writeHead(200, {
                                'Accept-Ranges': 'bytes',
                                'Cache-Control': 'public, max-age=31536000',
                                'Connection': 'keep-alive',
                                'Date': new Date().toUTCString(),
                                'ETag': 'W/"1c8d-15ea960df3b"',
                                'Last-Modified': stats.mtime.toUTCString(),
                                'Server': 'nginx/1.10.3 (Ubuntu)',
                                'X-Powered-By': 'Express',
                                'Content-Type': responseMime,
                                'Content-Length': stats.size,
                                'X-Content-Type-Options': 'nosniff',
                                'Content-Security-Policy': "sandbox; default-src 'none'",
                                'Content-Disposition': 'inline'
                            });
                            stream.pipe(res);
                        }
                    });
                }
            });
        });
    };
}(exported));

module.exports = exported;