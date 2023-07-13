var exported = {},
    countlyFs = require('../../../api/utils/countlyFs.js'),
    countlyConfig = require("../../../frontend/express/config");
var path = require('path');
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
        app.get(countlyConfig.path + '/star-rating/images/*', function(req, res) {
            countlyFs.getStats("star-rating", path.resolve(__dirname, './../images/' + req.params[0]), {id: "" + req.params[0]}, function(statsErr, stats) {
                if (statsErr || !stats || !stats.size) {
                    res.sendFile(path.resolve(__dirname + './../../../frontend/express/public/images/default_app_icon.png'));
                }
                else {
                    countlyFs.getStream("star-rating", path.resolve(__dirname, './../images/' + req.params[0]), {id: "" + req.params[0]}, function(streamErr, stream) {
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