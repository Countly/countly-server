var pluginManager = require("../../../../plugins/pluginManager");
var Promise = require("bluebird");
var countlyCommon = require("../../../../api/lib/countly.common");
var countlyDB = pluginManager.dbConnection("countly");
var countlyDrillDB = pluginManager.dbConnection("countly_drill");
 
var webApps = [];
var countlyDrillDBCollections = [];
var crypto = require('crypto');

var fs = require("fs");
var path = require("path");
var moment = require("moment");

var time = moment().format("YYYY-MM-DD_HH:mm:SS");
var urlParser = require("../../../../plugins/sources/api/api").urlParser;

var dir = path.resolve(__dirname, "drill_source_backups_" + time);

var getExportCommand = function(collection){
    fs.mkdir(dir, function(){
        var params = pluginManager.getDbConnectionParams("countly_drill");
        params.query = "'"+JSON.stringify({"_id": "meta_v2_up.src"})+"'";
         
        
        function outputParams(params) {
            var out = "mongoexport";
            for(var i in params){
                out += " --"+i+" "+params[i];
            }
            console.log(out);
        }
        
        params.collection = collection;
        params.out = path.join(dir, collection + "_meta_v2_up.src.json");
        outputParams(params);
    });
}



var getWebApps = function (db) {
    return new Promise(function (resolve, reject) {
        db.collection('apps').find({}).toArray(function (err, apps) {
            var webApps = apps.filter(function (app) {
                return app.type === 'web';
            });
            resolve(webApps || []);
        })
    })
    .catch(function (e) {
        reject(e);
    })
}

var getAppEventList = function(db, appID) {
    return new Promise(function (resolve, reject) {
        db.collection('events').findOne({"_id": appID}, function (err, events) {
            resolve(events && events.list || []);
        })
    })
    .catch(function (e) {
        reject(e);
    })
}

var checkSource = function (db, collection) {
    return new Promise(function (resolve, reject) {
        db.collection(collection).findOne({"_id": "meta_v2_up.src"}, function (err, doc) {
            resolve(doc || null);
        })
    }).catch(function (e) {
        reject(e);
    })
}

var updateNewDoc = function (doc, db, collection) {
    var newDoc  = {}
    for(var key in  doc){ 
        var url = countlyCommon.decode(key);
        var newUrl = urlParser(url);
        var newKey = countlyCommon.encode(newUrl);
        newDoc[newKey] = doc[key];
    }

    return new Promise(function (resolve, reject) {
        db.collection(collection).remove({"_id": "meta_v2_up.src"}, function(err, result){
            if(!err){
                db.collection(collection).insert(newDoc, function (err, result) {
                    resolve(result || null);
                })
            }
        })
    }).catch(function (e) {
        reject(e);
    })


}

var arguments = process.argv.splice(2);
var command = arguments && arguments[0];

Promise.coroutine(function * () {
    webApps = yield getWebApps(countlyDB); 
    for(var i = 0; i < webApps.length; i++){
        var appID =  webApps[i]._id;
        var events = yield getAppEventList(countlyDB, appID);
        events.push("[CLY]_session");
        for(var k = 0; k < events.length; k++){
            collectionName = "drill_events" + crypto.createHash('sha1').update(events[k] + appID).digest('hex')
            if(command === "backup"){ 
                var doc = yield checkSource(countlyDrillDB, collectionName);
                if(doc) {
                    getExportCommand(collectionName);
                }
            }
            if(command === "modify"){
                var doc = yield checkSource(countlyDrillDB, collectionName);
                if(doc) {
                  
                   var newDoc = yield updateNewDoc(doc, countlyDrillDB, collectionName);
                   console.log(doc);
                   console.log("new doc", newDoc.ops);
                }
            } 
        } 
    }

    countlyDB.close();
    countlyDrillDB.close();
    return;
})()