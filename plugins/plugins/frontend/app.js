var plugin = {},
	countlyConfig = require('../../../frontend/express/config'),
	plugins = require('../../pluginManager.js');

(function (plugin) {
	plugin.init = function(app, countlyDb){	};
}(plugin));

module.exports = plugin;