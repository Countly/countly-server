var exported = {},
    countlyFs = require('../../../api/utils/countlyFs.js'),
    countlyConfig = require("../../../frontend/express/config");
var path = require('path');

/**
 * Resolve a request path under a static base directory.
 * @param {string} baseDir - base static directory
 * @param {string} requestPath - user-supplied request path
 * @returns {string|null} contained path or null
 */
function safeStaticPath(baseDir, requestPath) {
    baseDir = path.resolve(baseDir);
    requestPath = (requestPath + "").replace(/\\/g, "/");
    while (requestPath.indexOf("/") === 0) {
        requestPath = requestPath.substring(1);
    }
    var resolvedPath = path.resolve(baseDir, requestPath);
    if (resolvedPath === baseDir || resolvedPath.indexOf(baseDir + path.sep) === 0) {
        return resolvedPath;
    }
    return null;
}

(function(plugin) {
    plugin.init = function(app) {

        /**
         * Method that render ratings popup template
         * @param {*} req - Express request object
         * @param {*} res - Express response object
         */
        function renderPopup(req, res) {
            let countlyPath = countlyConfig.path || '';

            if (countlyPath.length > 0 && !countlyPath.startsWith('/')) {
                countlyPath = `/${countlyPath}`;
            }

            res.removeHeader('X-Frame-Options');
            res.render('../../../plugins/star-rating/frontend/public/templates/feedback-popup', { countlyPath });
        }

        app.get(countlyConfig.path + '/feedback/rating', renderPopup);
        // keep this for backward compatability
        app.get(countlyConfig.path + '/feedback', renderPopup);
        app.get(countlyConfig.path + '/feedback/preview/*', function(req, res/*, next*/) {
            if (!req.params || !req.params[0] || req.params[0] === '') {
                res.sendFile(__dirname + '/public/images/default_app_icon.png');
            }
            else {
                countlyFs.gridfs.getDataById("feedback", req.params[0], function(err, data) {
                    if (err || !data) {
                        res.sendFile(__dirname + '/public/images/default_app_icon.png');
                    }
                    else {
                        var dd = data.split(',');
                        var img = Buffer.from(dd[1], 'base64');
                        res.writeHead(200, {
                            'Content-Type': dd = dd[0].substr(5, dd[0].length - 12),
                            'Content-Length': img.length
                        });
                        res.end(img);
                    }
                });
            }
        });
        app.get(countlyConfig.path + '/star-rating/images/*', function(req, res) {
            var imagePath = safeStaticPath(path.resolve(__dirname, './../images'), req.params[0]);
            if (!imagePath) {
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
                            res.writeHead(200, {
                                'Accept-Ranges': 'bytes',
                                'Cache-Control': 'public, max-age=31536000',
                                'Connection': 'keep-alive',
                                'Date': new Date().toUTCString(),
                                'ETag': 'W/"1c8d-15ea960df3b"',
                                'Last-Modified': stats.mtime.toUTCString(),
                                'Server': 'nginx/1.10.3 (Ubuntu)',
                                'X-Powered-By': 'Express',
                                'Content-Type': 'image/png',
                                'Content-Length': stats.size
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
