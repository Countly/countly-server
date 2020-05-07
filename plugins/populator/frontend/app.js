var exported = {},
    countlyConfig = require("../../../frontend/express/config"),
    path = require('path'),
    fs = require('fs');

(function(plugin) {
    plugin.init = function(app) {
        app.get(countlyConfig.path + '/:id/:page', function(req, res) {
            var url = 'public/templates/' + req.params.page;
            var pageSourceCode = fs.readFileSync(path.resolve(__dirname, url));
            res.writeHead(200, { 'Content-Type': 'text/html'});
            res.end(pageSourceCode);
        });
    };
}(exported));

module.exports = exported;