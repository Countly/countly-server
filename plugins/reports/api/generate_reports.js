//start db connection
var mongo = require('mongoskin'),
    countlyConfig = require('../../../frontend/express/config'),
    plugins = require('../../pluginManager.js'),
    async = require("async"),
    time = require('time'),
    reports = require("./reports");
var dbName;
var dbOptions = {
    server:{auto_reconnect:true, poolSize: countlyConfig.mongodb.max_pool_size, socketOptions: { keepAlive: 30000, connectTimeoutMS: 0, socketTimeoutMS: 0 }},
    replSet:{socketOptions: { keepAlive: 30000, connectTimeoutMS: 0, socketTimeoutMS: 0 }},
    mongos:{socketOptions: { keepAlive: 30000, connectTimeoutMS: 0, socketTimeoutMS: 0 }}
};

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

if (typeof countlyConfig.mongodb === "string") {
    dbName = countlyConfig.mongodb;
} else{
    countlyConfig.mongodb.db = countlyConfig.mongodb.db || 'countly';
    if ( typeof countlyConfig.mongodb.replSetServers === 'object'){
        //mongodb://db1.example.net,db2.example.net:2500/?replicaSet=test
        dbName = countlyConfig.mongodb.replSetServers.join(",")+"/"+countlyConfig.mongodb.db;
        if(countlyConfig.mongodb.replicaName){
            dbOptions.replSet.rs_name = countlyConfig.mongodb.replicaName;
        }
    } else {
        dbName = (countlyConfig.mongodb.host + ':' + countlyConfig.mongodb.port + '/' + countlyConfig.mongodb.db);
    }
}
if(countlyConfig.mongodb.username && countlyConfig.mongodb.password){
    dbName = countlyConfig.mongodb.username + ":" + countlyConfig.mongodb.password +"@" + dbName;
}
if(dbName.indexOf("mongodb://") !== 0){
    dbName = "mongodb://"+dbName;
}
var countlyDb = mongo.db(dbName, dbOptions);
countlyDb._emitter.setMaxListeners(0);
if(!countlyDb.ObjectID)
    countlyDb.ObjectID = mongo.ObjectID;
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