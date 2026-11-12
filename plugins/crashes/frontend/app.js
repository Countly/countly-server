var exportedPlugin = {};

(function(plugin) {
    // The plugin has no server-rendered pages. The module still has to load, because
    // the plugin manager serves the plugin's frontend/public folder only for plugins
    // whose frontend/app.js loads.
    plugin.init = function() {};
}(exportedPlugin));

module.exports = exportedPlugin;
