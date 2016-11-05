var plugin = {},
	common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
	plugins.appTypes.push("mobile");
}(plugin));

module.exports = plugin;