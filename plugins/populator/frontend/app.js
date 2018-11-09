var exported = {},
    countlyConfig = require("../../../frontend/express/config"),
    path = require('path'),
    fs = require('fs');

(function(plugin) {
    plugin.init = function(app) {
        app.get(countlyConfig.path + '/:id/demo-page.html', function(req, res) {
            var pageSourceCode = fs.readFileSync(path.resolve(__dirname, 'public/templates/demo-page.html'));
            res.writeHead(200, { 'Content-Type': 'text/html'});
            res.end(pageSourceCode);
        });
    };
}(exported));

module.exports = exported;