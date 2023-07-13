//get command line arguments (skip node and file arguments)
/*
var myArgs = process.argv.slice(2);

//check if we have an id
if(myArgs[0]){
    //start db connection
    var plugins = require('../../pluginManager.js'),
        reports = require("./reports");
    plugins.dbConnection().then((countlyDb) => {
    //load configs
    plugins.loadConfigs(countlyDb, function(){
        //send report
        reports.sendReport(countlyDb, myArgs[0], function(err, res){
            //close db to stop process
            countlyDb.close();
            process.exit();
        });
    });
    });
}*/