//start db connection
var mongo = require('mongoskin'),
    countlyConfig = require('../../../frontend/express/config'),
    plugins = require('../../pluginManager.js'),
    async = require("async"),
    reports = require("./reports");
var dbName;
var dbOptions = {
    server:{auto_reconnect:true, poolSize: countlyConfig.mongodb.max_pool_size, socketOptions: { keepAlive: 30000, connectTimeoutMS: 0, socketTimeoutMS: 0 }},
    replSet:{socketOptions: { keepAlive: 30000, connectTimeoutMS: 0, socketTimeoutMS: 0 }},
    mongos:{socketOptions: { keepAlive: 30000, connectTimeoutMS: 0, socketTimeoutMS: 0 }}
};

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
    var cache = {};
    countlyDb.collection("reports").find({}).toArray(function(err, res){
        async.eachSeries(res, function(report, done){
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
        }, function(err, results) {
            console.log("all reports sent");
            countlyDb.close();
            process.exit();
        });
    })
});