//start db connection
/*
var plugins = require('../../pluginManager.js'),
    async = require("async"),
    reports = require("./reports");
plugins.dbConnection().then((countlyDb) => {
//load configs
plugins.loadConfigs(countlyDb, function(){
    var cache = {};
    var date = new Date();
    var hour = date.getHours();
    var dow = date.getDay();
    if(dow == 0)
        dow = 7;
    
    console.log(hour, dow);
    countlyDb.collection("reports").find({r_hour:hour}).toArray(function(err, res){
        async.eachSeries(res, function(report, done){
            if(report.frequency == "daily" || (report.frequency == "weekly" && report.r_day == dow)){
                reports.getReport(countlyDb, report, function(err, ob){
                    if(!err){
                        reports.send(ob.report, ob.message, function(){
                            console.log("sent to", ob.report.emails[0]);
                            done(null, null);
                        });
                    }
                    else{
                        console.log(err, ob.report.emails[0]);
                        done(null, null);
                    }
                }, cache);
            }
            else{
               done(null, null); 
            }
        }, function(err, results) {
            console.log("all reports sent");
            countlyDb.close();
            process.exit();
        });
    })
});
});*/