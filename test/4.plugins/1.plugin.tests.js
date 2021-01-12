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
        }
    }
}