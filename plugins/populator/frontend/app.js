var exported = {},
    countlyConfig = require("../../../frontend/express/config"),
    path = require('path'),
    fs = require('fs'),
    ejs = require('ejs');

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
            const file = path.resolve(__dirname, url);
            const pageIndex = url.replace(/\D/g, '') || '0';
            const pageSourceCode = fs.readFileSync(file, 'utf-8');
            const response = ejs.render(pageSourceCode, { pageIndex });
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(response);
        });
    };
}(exported));

module.exports = exported;