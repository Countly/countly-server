var exportedPlugin = {},
    plugins = require("../../pluginManager");

(function(plugin) {
    plugin.init = function() {

    };

    plugin.renderDashboard = function(ob) {
        ob.data.countlyGlobal.maximum_allowed_parameters = plugins.getConfig("remote-config").maximum_allowed_parameters;
        ob.data.countlyGlobal.conditions_per_paramaeters = plugins.getConfig("remote-config").conditions_per_paramaeters;
    };
}(exportedPlugin));

module.exports = exportedPlugin;