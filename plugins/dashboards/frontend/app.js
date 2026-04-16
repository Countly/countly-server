var plugins = require('../../pluginManager.js');
var exported = {};
var countlyConfig = require('../../../frontend/express/config', 'dont-enclose');
var countlyFs = require('../../../api/utils/countlyFs.js');
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
    plugin.init = function(/*app, countlyDb*/) {

    };

    plugin.renderDashboard = function(ob) {
        ob.data.countlyGlobal.sharing_status = plugins.getConfig("dashboards").sharing_status;
        ob.data.countlyGlobal.allow_public_dashboards = plugins.getConfig("dashboards").allow_public_dashboards;
    };

    plugin.staticPaths = function(app/*, countlyDb*/) {
        app.get(countlyConfig.path + "/dashboards/images/screenshots/*", function(req, res) {
            if (!req || !req.params) {
                return res.send(false);
            }
            var fileName = "";
            if (req.params && req.params[0]) {
                fileName = req.params[0];
            }
            var requestPath = safeStaticPath(__dirname + '/public/images/screenshots', fileName);
            if (!requestPath) {
                return res.send(false);
            }
            countlyFs.getStats("screenshots", requestPath, {id: "dashboards/" + fileName}, function(err, stats) {
                if (err || !stats || !stats.size) {
                    return res.send(false);
                }

                countlyFs.getStream("screenshots", requestPath, {id: "dashboards/" + fileName}, function(err2, stream) {
                    if (err2 || !stream) {
                        return res.send(false);
                    }

                    res.writeHead(200, {
                        'Accept-Ranges': 'bytes',
                        'Cache-Control': 'public, max-age=31536000',
                        'Connection': 'keep-alive',
                        'Date': new Date().toUTCString(),
                        'Last-Modified': stats.mtime.toUTCString(),
                        'Content-Type': 'image/png',
                        'Content-Length': stats.size
                    });
                    stream.pipe(res);
                });
            });
        });
    };
}(exported));

module.exports = exported;
