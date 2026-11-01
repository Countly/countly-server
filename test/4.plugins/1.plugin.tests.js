var manager = require('../../plugins/pluginManager.js');
var plugins = manager.getPlugins();

if (plugins.length > 0) {
    //run install files
    for (var i = 0, l = plugins.length; i < l; i++) {
        try {
            require("../../plugins/" + plugins[i] + "/tests");
        }
        catch (ex) {
            console.log(ex);
            // a plugin whose tests cannot be loaded fails the run instead of dropping out of it
            failToLoad(plugins[i], ex);
        }
    }
}

/**
 * Register a failing test for a plugin whose test file threw while loading
 * @param {string} plugin - plugin name
 * @param {Error} error - what it threw
 */
function failToLoad(plugin, error) {
    describe(plugin + ' plugin tests', function() {
        it('load', function() {
            throw error;
        });
    });
}
