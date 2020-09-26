var manager = require('../../../plugins/pluginManager.js'),
    dependencies = require('../../../plugins/pluginDependencies.js'),
    fs = require('fs'),
    path = require('path'),
    pluginsListPath = path.resolve(__dirname, '../../../plugins/plugins.json'),
    async = require('async');

var plugins = manager.getPlugins();
var myArgs = process.argv.slice(2);
function save_changes(data, finalList) {
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
            fs.writeFile(pluginsListPath, JSON.stringify(finalList), 'utf8', function() {
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

        var ancestorsNeedToBeEnabled = [];

        dpcs[pluginName].up.forEach(function(parentName) {
            if (plugins.indexOf(parentName) === -1) {
                ancestorsNeedToBeEnabled.push(parentName);
            }
        });

        if (ancestorsNeedToBeEnabled.length > 0) {
            console.log(`> Enabling '${pluginName}' will cause depended plugin(s) (${ancestorsNeedToBeEnabled.join(', ')}) to be enabled as well.`);
            console.log("> Do you want to continue?");
        }

        var installList = ancestorsNeedToBeEnabled.concat(pluginName),
            data = {},
            pluginsCopy = plugins.slice();

        async.eachSeries(installList, function(toBeInstalled, callback) {
            manager.installPlugin(toBeInstalled, function(pluginErr) {
                if (!pluginErr) {
                    data[toBeInstalled] = true;
                    pluginsCopy.push(toBeInstalled);
                    callback();
                }
                else {
                    console.log("Could not be enabled:", toBeInstalled);
                    callback(pluginErr);
                }
            });
        }, function(generalErr) {
            save_changes(data, pluginsCopy);
            if (generalErr) {
                console.log("Install completed with errors:", generalErr);
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

        var descendantsNeedToBeDisabled = [];

        dpcs[pluginName].down.forEach(function(childName) {
            if (plugins.indexOf(childName) > -1) {
                descendantsNeedToBeDisabled.push(childName);
            }
        });

        if (descendantsNeedToBeDisabled.length > 0) {
            console.log(`> Disabling '${pluginName}' will cause dependent plugin(s) (${descendantsNeedToBeDisabled.join(', ')}) to be disabled as well.`);
            console.log("> Do you want to continue?");
        }

        var uninstallList = descendantsNeedToBeDisabled.concat([pluginName]),
            data = {},
            pluginsCopy = plugins.slice();

        async.eachSeries(uninstallList, function(toBeUninstalled, callback) {
            manager.uninstallPlugin(toBeUninstalled, function(pluginErr) {
                if (!pluginErr) {
                    data[toBeUninstalled] = false;
                    pluginsCopy.splice(pluginsCopy.indexOf(toBeUninstalled), 1);
                    callback();
                }
                else {
                    console.log("Could not be disabled:", toBeUninstalled);
                    callback(pluginErr);
                }
            });
        }, function(generalErr) {
            save_changes(data, pluginsCopy);
            if (generalErr) {
                console.log("Uninstall completed with errors:", generalErr);
            }
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