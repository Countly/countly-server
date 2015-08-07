//get command line arguments (skip node and file arguments)
var myArgs = process.argv.slice(2);

//check if we have an id
if(myArgs[0]){
    //start db connection
    var mongo = require('mongoskin'),
        countlyConfig = require('../../../frontend/express/config'),
        reports = require("./reports");
    var dbName;
    var dbOptions = {
        server:{auto_reconnect:true, socketOptions: { keepAlive: 30000, connectTimeoutMS: 0, socketTimeoutMS: 0 }},
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
    
    //send report
    reports.sendReport(countlyDb, myArgs[0], function(err, res){
        //close db to stop process
        countlyDb.close();
    });
}