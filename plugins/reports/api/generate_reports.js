//start db connection
var plugins = require('../../pluginManager.js'),
    async = require("async"),
    time = require('time'),
    reports = require("./reports");

function convertToTimezone(props){
    //convert time
    var date = new time.Date();
    var serverOffset = date.getTimezoneOffset();
    date.setTimezone(props.timezone);
    var clientOffset = date.getTimezoneOffset()
    var diff = serverOffset - clientOffset;
    var day = props.day;
    var hour = props.hour - Math.floor(diff/60);
    var minute = props.minute - diff%60;
    
    if(minute < 0){
        minute = 60 + minute;
        hour--;
    }
    else if(minute > 59){
        minute = minute - 60;
        hour++;
    }
    
    if(hour < 0){
        hour = 24 + hour;
        day--;
    }
    else if(hour > 23){
        hour = hour - 24;
        day++;
    }
    
    if(day < 1){
        day = 7 + day;
    }
    else if(day > 7){
        day = day - 7;
    }
    
    props.r_day = day;
    props.r_hour = hour;
    props.r_minute = minute;
}

var countlyDb = plugins.dbConnection();
//load configs
plugins.loadConfigs(countlyDb, function(){
    var appCache = {};
    var cache = {};
    countlyDb.collection("members").find().toArray(function(err, res){
        var arr = [];
        for(var i = 0; i <  res.length; i++){
            if(!res[i].global_admin)
            arr.push({emails:[res[i].email], apps:res[i].admin_of || [], metrics:{"analytics":true, "revenue":true, "push":true, "crash":true }, frequency:"daily", hour:17, minute:0, day:1, timezone:"Etc/GMT", user:res[i]._id});
        }
        async.map(arr, function(report, done){
            function insertReport(){
                convertToTimezone(report);
                countlyDb.collection("reports").insert(report, function(){
                    console.log("created", report);
                    done(null, null);
                });
            }
            var app_id = report.apps[0];
            if(app_id){
                if(typeof appCache[app_id] != "undefined"){
                    report.timezone = appCache[app_id].timezone;
                    insertReport();
                }
                else{
                    countlyDb.collection("apps").findOne({_id:countlyDb.ObjectID(app_id)}, function(err, app){
                        appCache[app_id] = app;
                        report.timezone = appCache[app_id].timezone;
                        insertReport();
                    });
                }
            }
            else
                insertReport();
        }, function(err, results) {
            console.log("all reports generated");
            countlyDb.close();
            process.exit();
        });
    })
    /*//send report
    reports.sendReport(countlyDb, myArgs[0], function(err, res){
        //close db to stop process
        countlyDb.close();
    });*/
});