var manager = require('../../../plugins/pluginManager.js'),
    dependencies = require('../../../plugins/pluginDependencies.js'),
    fs = require('fs'),
    path = require('path'),
    pluginsListPath = path.resolve(__dirname, '../../../plugins/plugins.json'),
    async = require('async'),
    readline = require("readline");

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

function runInstall(installList) {
    var data = {},
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

function runUninstall(uninstallList) {
    var data = {},
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

//check if we have a command
manager.dbConnection().then((db) => {
    manager.loadConfigs(db, function() {
        db.close();
        if (myArgs[0] == "enable" && myArgs[1]) {
            let pluginName = myArgs[1];
            if (plugins.indexOf(pluginName) == -1) {
                let {dpcs} = dependencies.getDependencies(plugins.concat(pluginName), {
                    discoveryStrategy: "enableParents",
                    env: "cli"
                });

                if (!dpcs[pluginName]) {
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
                    let message = `> Enabling '${pluginName}' will cause depended plugin(s) (${ancestorsNeedToBeEnabled.join(', ')}) to be enabled as well.`;
                    message += "\n> Do you want to continue (y/N)? ";

                    let rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });

                    rl.question(message, function(answer) {
                        answer = answer.toLowerCase().trim();
                        if (answer === "y") {
                            runInstall(ancestorsNeedToBeEnabled.concat([pluginName]));
                        }
                        else {
                            console.log("Install aborted.");
                        }
                        rl.close();
                    });

                }
                else {
                    runInstall([pluginName]);
                }

            }
            else {
                console.log("Plugin already installed");
            }
        }
        else if (myArgs[0] == "disable" && myArgs[1]) {
            let pluginName = myArgs[1];
            if (plugins.indexOf(pluginName) > -1) {
                let {dpcs} = dependencies.getDependencies(plugins.concat(pluginName), {
                    discoveryStrategy: "enableParents",
                    env: "cli"
                });

                if (!dpcs[pluginName]) {
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
                    let message = `> Disabling '${pluginName}' will cause dependent plugin(s) (${descendantsNeedToBeDisabled.join(', ')}) to be disabled as well.`;
                    message += "\n> Do you want to continue (y/N)? ";

                    let rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });

                    rl.question(message, function(answer) {
                        answer = answer.toLowerCase().trim();
                        if (answer === "y") {
                            runUninstall(descendantsNeedToBeDisabled.concat([pluginName]));
                        }
                        else {
                            console.log("Uninstall aborted.");
                        }
                        rl.close();
                    });
                }
                else {
                    runUninstall([pluginName]);
                }
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
    });
});
