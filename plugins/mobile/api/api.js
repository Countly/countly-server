var plugin = {},
    plugins = require('../../pluginManager.ts');

(function() {
    plugins.appTypes.push("mobile");
}(plugin));

module.exports = plugin;