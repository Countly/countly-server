var plugins = require('../../pluginManager.js');
var exported = {};
var countlyConfig = require('../../../frontend/express/config', 'dont-enclose');
var countlyFs = require('../../../api/utils/countlyFs.js');

(function(plugin) {
    plugin.init = function(/*app, countlyDb*/) {

    };

    plugin.renderDashboard = function(ob) {
        ob.data.countlyGlobal.sharing_status = plugins.getConfig("dashboards").sharing_status;
    };

    plugin.staticPaths = function(app/*, countlyDb*/) {
        app.get(countlyConfig.path + "/dashboards/images/screenshots/*", function(req, res) {
            var requestPath = req.path;
            var reqArray = requestPath.split("/");
            var fileName = "";
            if (reqArray && reqArray.length) {
                reqArray[0] += "/frontend/public";
                fileName = reqArray[reqArray.length - 1];
            }
            requestPath = reqArray.join("/");
            countlyFs.getStats("screenshots", __dirname + '/../../../plugins/' + requestPath, {id: "dashboards/" + fileName}, function(err, stats) {
                if (err || !stats || !stats.size) {
                    return res.send(false);
                }

                countlyFs.getStream("screenshots", __dirname + '/../../../plugins/' + requestPath, {id: "dashboards/" + fileName}, function(err2, stream) {
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