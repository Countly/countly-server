var exportedPlugin = {};

(function(plugin) {
    // Crash groups are viewed in the dashboard only; there is no public crash page.
    plugin.init = function() {};
}(exportedPlugin));

module.exports = exportedPlugin;
