var pluginOb = {},
    plugins = require('../../pluginManager.ts');

(function() {
    plugins.appTypes.push("web");
}(pluginOb));

module.exports = pluginOb;
