var exported = {};
var plugins = require('../../pluginManager.js');

(function(plugin) {
    plugin.init = function() {

    };

    plugin.renderDashboard = function(ob) {
        ob.data.countlyGlobal.views_limit = plugins.getConfig("views").view_limit;
    };
}(exported));

module.exports = exported;