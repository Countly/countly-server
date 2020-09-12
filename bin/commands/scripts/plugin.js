var manager = require('../../../plugins/pluginManager.js'),
    dependencies = require('../../../plugins/pluginDependencies.js'),
    fs = require('fs'),
    path = require('path'),
    pluginsListPath = path.resolve(__dirname, '../../../plugins/plugins.json');

var plugins = manager.getPlugins();
var myArgs = process.argv.slice(2);
function save_changes(data) {
    manager.dbConnection().then((db) => {
        manager.loadConfigs(db, function() {
            if (manager.getConfig("api").sync_plugins) {
                manager.updateConfigs(db, "plugins", data, function() {
                    db.close();
                });
            }
            else {
                db.close();
            }
            var fixedPlugins = dependencies.getFixedPluginList(plugins, {
                discoveryStrategy: "disableChildren",
                env: "cli"
            });
            fs.writeFile(pluginsListPath, JSON.stringify(fixedPlugins), 'utf8', function() {
                console.log("Changes saved");
            });
        });
    });
}

//check if we have a command
if (myArgs[0] == "enable" && myArgs[1]) {
    var pluginName = myArgs[1];
    if (plugins.indexOf(pluginName) == -1) {
        var {dpcs} = dependencies.getDependencies(plugins.concat(pluginName), {
            discoveryStrategy: "enableParents",
            env: "cli"
        });

        if (!dpcs[pluginName]){
            console.log("Plugin not found.");
            return;
        }

        var parentsNeedToBeEnabled = [];

        Object.keys(dpcs[pluginName].parents).forEach(function(parentName) {
            if (plugins.indexOf(parentName) === -1) {
                parentsNeedToBeEnabled.push(parentName);
            }
        });

        if (parentsNeedToBeEnabled.length > 0) {
            console.log(`> Enabling '${pluginName}' will cause depended plugin(s) (${parentsNeedToBeEnabled.join(', ')}) to be enabled as well.`);
            console.log("> Do you want to continue?");
        }
        return;

        manager.installPlugin(pluginName, function(err) {
            if (!err) {
                plugins.push(pluginName);
                let data = {};
                data[pluginName] = true;
                save_changes(data);
            }
            else {
                console.log("Could not enable", pluginName);
            }
        });
    }
    else {
        console.log("Plugin already installed");
    }
}
else if (myArgs[0] == "disable" && myArgs[1]) {
    var pluginName = myArgs[1];
    if (plugins.indexOf(pluginName) > -1) {
        var {dpcs} = dependencies.getDependencies(plugins.concat(pluginName), {
            discoveryStrategy: "enableParents",
            env: "cli"
        });

        if (!dpcs[pluginName]){
            console.log("Plugin not found.");
            return;
        }

        var childrenNeedToBeDisabled = [];

        Object.keys(dpcs[pluginName].children).forEach(function(childName) {
            if (plugins.indexOf(childName) > -1) {
                childrenNeedToBeDisabled.push(childName);
            }
        });

        if (childrenNeedToBeDisabled.length > 0) {
            console.log(`> Disabling '${pluginName}' will cause dependent plugin(s) (${childrenNeedToBeDisabled.join(', ')}) to be disabled as well.`);
            console.log("> Do you want to continue?");
        }
        return;
        manager.uninstallPlugin(pluginName, function() {
            plugins.splice(plugins.indexOf(pluginName), 1);
            let data = {};
            data[pluginName] = false;
            save_changes(data);
        });
    }
    else {
        console.log("Plugin already uninstalled");
    }
}
else if (myArgs[0] == "upgrade" && myArgs[1]) {
    if (plugins.indexOf(myArgs[1]) > -1) {
        require('../../../api/utils/log').setLevel('db:write', 'mute');
        manager.upgradePlugin(myArgs[1]);
    }
    else {
        console.log("Plugin is not installed");
    }
}
else if (myArgs[0] == "test" && myArgs[1]) {
    var enabled = myArgs.slice(1, myArgs.length).filter((n) => plugins.includes(n));
    if (enabled.length) {
        var Mocha = require('mocha');
        var mocha = new Mocha({
            reporter: 'spec',
            timeout: 50000
        });
        if (myArgs.indexOf("--debug") !== -1) {
            mocha.addFile(path.resolve(__dirname, '../../../test/4.plugins/separation/3.debug.js'));
        }
        if (myArgs.indexOf("--only") === -1) {
            mocha.addFile(path.resolve(__dirname, '../../../test/4.plugins/separation/1.setup.js'));
        }
        for (var i = 1; i < myArgs.length; i++) {
            if (myArgs[i].indexOf("--") !== 0 && plugins.indexOf(myArgs[i]) !== -1) {
                mocha.addFile(path.resolve(__dirname, '../../../plugins/' + myArgs[i] + "/tests"));
            }
        }
        if (myArgs.indexOf("--only") === -1) {
            mocha.addFile(path.resolve(__dirname, '../../../test/4.plugins/separation/2.teardown.js'));
        }
        // Run the tests.
        mocha.run(function(failures) {
            process.on('exit', function() {
                process.exit(failures); // exit with non-zero status if there were failures
            });
        });
    }
    else {
        console.log("Plugin is not installed");
    }
}