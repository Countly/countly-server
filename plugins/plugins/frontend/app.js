var plugin = {},
	countlyConfig = require('../../../frontend/express/config'),
	plugins = require('../../pluginManager.js');

(function (plugin) {
	plugin.init = function(app, countlyDb){
		app.post(countlyConfig.path+'/plugins/reload', function (req, res, next) {
			if (!req.session.uid) {
				res.send(false);
				res.end();
				return false;
			}
			plugins.reloadPlugins();
			res.send("reloaded");
		});
	};
}(plugin));

module.exports = plugin;