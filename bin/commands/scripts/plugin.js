var manager = require('../../../plugins/pluginManager.js'),
    fs = require('fs'),
	path = require('path');
    
var plugins = manager.getPlugins();
var myArgs = process.argv.slice(2);
function save_changes(data){
    var db = manager.dbConnection();
    manager.loadConfigs(db, function(){
        if(manager.getConfig("api").sync_plugins){
            manager.updateConfigs(db, "plugins", data, function(){
                db.close();
            });
        }
        else{
            db.close();
        }
        var dir = path.resolve(__dirname, '../../../plugins/plugins.json');
        fs.writeFile(dir, JSON.stringify(plugins), 'utf8', function(){
            console.log("Changes saved");
        });     
    });
}

//check if we have a command
if(myArgs[0] == "enable" && myArgs[1]){
    if(plugins.indexOf(myArgs[1]) == -1){
        manager.installPlugin(myArgs[1]);
        plugins.push(myArgs[1]);
        var data = {};
        data[myArgs[1]] = true;
        save_changes(data);
    }
    else{
        console.log("Plugin already installed");
    }
}
else if(myArgs[0] == "upgrade" && myArgs[1]){
    if(plugins.indexOf(myArgs[1]) > -1){
        manager.installPlugin(myArgs[1]);
    }
    else{
        console.log("Plugin is not installed");
    }
}
else if(myArgs[0] == "disable" && myArgs[1]){
    if(plugins.indexOf(myArgs[1]) > -1){
        manager.uninstallPlugin(myArgs[1]);
        plugins.splice(plugins.indexOf(myArgs[1]), 1);
        var data = {};
        data[myArgs[1]] = false;
        save_changes(data);
    }
    else{
        console.log("Plugin already uninstalled");
    }
}