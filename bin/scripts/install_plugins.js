var asyncjs = require('async');
var manager = require('../../plugins/pluginManager.js');
var plugins = manager.getPlugins();
require('../../api/utils/log').setLevel('db:write', 'mute');

if (plugins.length > 0) {
    asyncjs.eachSeries(plugins, function(plugin, done) {
        manager.installPlugin(plugin, function() {
            done();
        });
    }, function() {
        //processing plugin files for production mode
        console.log("Processing plugin files for production mode");
        manager.prepareProduction(() => {
            console.log("Exiting");
            process.exit(0);
        });
    });
}