var plugin = {};
var path = require('path');

(function (plugin) {
	plugin.init = function(app, countlyDb){

		app.get(countlyConfig.path+'/:id/demo-page.html', function (req, res, next) {
            var pageSourceCode = fs.readFileSync(path.resolve(__dirname, 'public/templates/demo-page.html'));
            res.writeHead(200, { 'Content-Type': 'text/html'});
            res.end(pageSourceCode); 
        });
	};
}(plugin));

module.exports = plugin;