var exportedPlugin = {},
    plugins = require('../../pluginManager.js');

(function(plugin) {
    plugin.init = function() {};

    plugin.renderDashboard = function(ob) {
        ob.data.countlyGlobal.domain = plugins.getConfig("api").domain;
    };
}(exportedPlugin));

module.exports = exportedPlugin;