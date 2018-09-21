var plugin = {},
    plugins = require('../../pluginManager.js');

(function() {
    plugins.appTypes.push("mobile");
}(plugin));

module.exports = plugin;