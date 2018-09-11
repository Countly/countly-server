var plugin = {},
    plugins = require('../../pluginManager.js');

(function() {
    plugins.appTypes.push("desktop");
}(plugin));

module.exports = plugin;