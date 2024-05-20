var asyncjs = require('async');
var manager = require('../../plugins/pluginManager.js');
var plugins = manager.getPlugins();
require('../../api/utils/log').setLevel('db:write', 'mute');

if (process.argv && process.argv.length > 2 && process.argv[2] === '--force') {
    process.env.FORCE_NPM_INSTALL = true;
}


manager.connectToAllDatabases().then((dbs) => {
    manager.loadConfigs(dbs[0], async() => {
        plugins = manager.getPlugins(true);
        if (!manager.getConfig("api").offline_mode) {
            await asyncjs.eachSeries(plugins, function(plugin, done) {
                manager.installPlugin(plugin, function() {
                    done();
                });
            });
        }
        else {
            console.log("Server is in offline mode, not installing any plugins.");
        }

        //processing plugin files for production mode
        console.log("Processing plugin files for production mode");
        manager.prepareProduction(() => {
            console.log("Exiting");
            process.exit(0);
        });
    });
});

