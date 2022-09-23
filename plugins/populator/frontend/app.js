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
            let pageIndex;
            if (predefinedTypes.includes(req.params.page)) {
                pageIndex = req.params.page.replace(/\D/g, '') || '0';
                url = 'public/templates/' + req.params.page.replace(/-\d/, '');
            }
            const file = path.resolve(__dirname, url);
            const pageSourceCode = fs.readFileSync(file, 'utf-8');
            const includes = {
                content2Cols: path.resolve(__dirname, 'public/templates/demo-content-2-cols.html'),
                content3Cols: path.resolve(__dirname, 'public/templates/demo-content-3-cols.html'),
                scripts: path.resolve(__dirname, 'public/templates/demo-scripts.html'),
            };

            const response = ejs.render(pageSourceCode, { pageIndex, includes });

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(response);
        });
    };
}(exported));

module.exports = exported;