var exported = {},
    countlyConfig = require("../../../frontend/express/config"),
    path = require('path'),
    fs = require('fs');

(function(plugin) {
    plugin.init = function(app) {
        const predefinedTypes = [
            "demo-banking.html",
            "demo-banking-1.html",
            "demo-banking-2.html",
            "demo-ecommerce.html",
            "demo-ecommerce-1.html",
            "demo-ecommerce-2.html",
            "demo-gaming.html",
            "demo-gaming-1.html",
            "demo-gaming-2.html",
            "demo-healthcare.html",
            "demo-healthcare-1.html",
            "demo-healthcare-2.html",
            "demo-navigation.html",
            "demo-navigation-1.html",
            "demo-navigation-2.html",
        ];
        app.get(countlyConfig.path + '/populator/:id/:page', function(req, res) {
            let url = 'public/templates/demo-page.html';
            if (predefinedTypes.includes(req.params.page)) {
                url = 'public/templates/' + req.params.page;
            }
            var pageSourceCode = fs.readFileSync(path.resolve(__dirname, url));
            res.writeHead(200, { 'Content-Type': 'text/html'});
            res.end(pageSourceCode);
        });
    };
}(exported));

module.exports = exported;