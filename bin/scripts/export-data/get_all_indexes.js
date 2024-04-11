/**
 *  Description: Script is used to get all indexes
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/export-data
 *  Command: node get_all_indexes.js
 */

var crypto = require('crypto');

const plugins = require('../../../plugins/pluginManager.js');
const common = require('../../../api/utils/common.js');
const Promise = require("bluebird");
const _ = require('underscore');
const async = require('async');

var run_countly = true;
var run_drill = true;


Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {


    //SET COMMON DBs
    common.db = countlyDb;
    common.drillDb = drillDb;
    var output = {};

    dbLoadEventsData(countlyDb, function(err, appList, eventList, viewList) {
        var dbs = [];
        if (run_countly) {
            dbs.push("countly");
        }
        if (run_drill) {
            dbs.push("drill");
        }
        Promise.each(dbs, function(dbname) {
            return new Promise((resolve) => {
                if (run_countly) {
                    var currentDB = common.db;
                    if (dbname === "drill") {
                        currentDB = drillDb;
                    }
                    currentDB.collections(function(err, collections) {
                        if (err) {
                            output[dbname] = {"err": err};

                        }
                        else {
                            output[dbname] = {"indexes": []};
                            Promise.all(collections.map((collection) => {
                                return new Promise((resolve1) => {
                                    collection.indexes(function(err, indexes) {
                                        var ob = parseCollectionName(collection.collectionName, appList, eventList, viewList);
                                        var goodName = ob.pretty;

                                        if (err) {
                                            output[dbname]["indexes"].push({"name": goodName, "collection": collection.collectionName, "err": err});
                                        }
                                        else {
                                            output[dbname]["indexes"].push({"name": goodName, "collection": collection.collectionName, "indexes": indexes});
                                        }
                                        resolve1();
                                    });
                                });
                            })).then(() => {
                                resolve();
                            });
                        }

                    });
                }
                else {
                    resolve();
                }

            });
        }).then(function(err) {
            if (err) {
                console.log(err);
            }
            console.log(JSON.stringify(output));
            countlyDb.close();
            drillDb.close();

        }).catch(function(err) {
            console.log("Error: " + err);
            countlyDb.close();
            drillDb.close();
        });

    });
});



var parseCollectionName = function parseCollectionName(name, apps, events, views) {
    var pretty = name;

    let isEvent = false;
    let isView = false;
    let eventHash = null;
    if (name.indexOf("events") === 0) {
        eventHash = name.substring(6);
        isEvent = true;
    }
    else if (name.indexOf("drill_events") === 0) {
        eventHash = name.substring(12);
        isEvent = true;
    }
    else if (name.indexOf("app_viewdata") === 0) {

        let hash = name.substring(12);
        if (views["app_viewdata" + hash]) {
            isView = true;
        }
    }
    if (isView) {
        let hash = name.substring(12);
        if (views["app_viewdata" + hash]) {
            pretty = name.replace(hash, views["app_viewdata" + hash]);
        }
    }
    else if (!isEvent) {
        for (let i in apps) {
            if (name.indexOf(i, name.length - i.length) !== -1) {
                pretty = name.replace(i, "(" + apps[i] + ")");
                break;
            }
        }
    }
    else {
        if (eventHash.length === 0) {
            //this is the "events" collection
            pretty = name;
        }
        else {
            const targetEntry = events[eventHash];
            if (!_.isUndefined(targetEntry)) {
                pretty = name.replace(eventHash, targetEntry);
            }
        }
    }

    return { name: name, pretty: pretty };
};


function dbLoadEventsData(db, callback) {

    /**
    * Get events collections with replaced app names
    * A helper function for db access check
    * @param {object} app - application object
    * @param {function} cb - callback method
    **/
    function getEvents(app, cb) {
        var result = {};
        common.db.collection('events').findOne({'_id': common.db.ObjectID(app._id + "")}, function(err, events) {
            if (!err && events && events.list) {
                for (let i = 0; i < events.list.length; i++) {
                    result[crypto.createHash('sha1').update(events.list[i] + app._id + "").digest('hex')] = "(" + app.name + ": " + events.list[i] + ")";
                }
            }
            if (plugins.internalDrillEvents) {
                for (let i = 0; i < plugins.internalDrillEvents.length; i++) {
                    result[crypto.createHash('sha1').update(plugins.internalDrillEvents[i] + app._id + "").digest('hex')] = "(" + app.name + ": " + plugins.internalDrillEvents[i] + ")";
                }
            }
            if (plugins.internalEvents) {
                for (let i = 0; i < plugins.internalEvents.length; i++) {
                    result[crypto.createHash('sha1').update(plugins.internalEvents[i] + app._id + "").digest('hex')] = "(" + app.name + ": " + plugins.internalEvents[i] + ")";
                }
            }
            cb(null, result);
        });
    }

    /**
    * Get views collections with replaced app names
    * A helper function for db access check
    * @param {object} app - application object
    * @param {function} cb - callback method
    **/
    function getViews(app, cb) {
        var result = {};
        common.db.collection('views').findOne({'_id': common.db.ObjectID(app._id + "")}, function(err, viewDoc) {
            if (!err && viewDoc && viewDoc.segments) {
                for (var segkey in viewDoc.segments) {
                    result["app_viewdata" + crypto.createHash('sha1').update(segkey + app._id).digest('hex')] = "(" + app.name + ": " + segkey + ")";
                }
            }
            result["app_viewdata" + crypto.createHash('sha1').update("" + app._id).digest('hex')] = "(" + app.name + ": no-segment)";
            cb(null, result);
        });
    }

    db.collection("apps").find({}).toArray(function(err, apps) {
        var appList = {};
        for (let i = 0; i < apps.length; i++) {
            appList[apps[i]._id + ""] = apps[i].name;
        }

        async.map(apps, getEvents, function(err, events) {
            var eventList = {};
            for (let i = 0; i < events.length; i++) {
                for (var j in events[i]) {
                    eventList[j] = events[i][j];
                }
            }
            async.map(apps, getViews, function(err1, views) {
                var viewList = {};
                for (let i = 0; i < views.length; i++) {
                    for (let z in views[i]) {
                        viewList[z] = views[i][z];
                    }
                }
                callback(err, appList, eventList, viewList);
            });
        });
    });
}