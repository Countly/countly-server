/** SCRIPT IS DEPRECATED FOR  NEWARCH. Needs to be rewritten to work with the new architecture */
//Put script in ./countly/plugins/views/scripts/omitViewSegments.js
/*
The script deletes data for specific segments in aggregated data. It also can set an omitting list in the database to ensure that segments are also omitted on incoming data.
*/

//to run:
// cd `countly dir`
// node ./plugins/views/scripts/omitViewSegments.js


var crypto = require('crypto');
var pluginManager = require('./../../../plugins/pluginManager.ts');
var Promise = require("bluebird");

var app_list = []; //leave empty to process all apps or add specific app ids to the array.
var DRY_RUN = false; //set to true to see what will be deleted without actually deleting anything
var save_list_in_database = true; //If omitting is successful, should list be saved in views setting. If saved in views setting, it will ensure segment not reappearing on incoming data. It will have effect only if upgraded to version at least 23.06.16

var omitSegments = [];//list with segments to omit. If empty will check allsegments in this app and omit those with more than segmentValueLimit values.
var segmentValueLimit = 10; //segment value limit. If segment has more than this number of values, it will be omitted.

Promise.all([pluginManager.dbConnection("countly")]).spread(function(countlyDb) {
    console.log("Validating app list: ");
    getAppList({db: countlyDb}, function(err, apps) {
        if (apps && apps.length > 0) {
            console.log(apps.length + " apps found");
            Promise.each(apps, function(app) {
                return new Promise(function(resolve) {
                    console.log("processing app:" + app.name);
                    getOmitList(omitSegments, {db: countlyDb, app_id: app._id}, function(error, omit) {
                        omit = omit || [];
                        var promises = [];
                        var errCn = 0;
                        for (var z = 0; z < omit.length; z++) {
                            var colName = "app_viewdata" + crypto.createHash('sha1').update(omit[z] + (app._id + "")).digest('hex');
                            promises.push(new Promise(function(resolve2) {
                                if (DRY_RUN) {
                                    console.log("DRY RUN: collection we would try to delete: " + colName);
                                    resolve2();
                                }
                                else {
                                    console.log(colName);
                                    countlyDb.collection(colName).drop(function(err) {
                                        if (err && err.code !== 26) {
                                            console.log(JSON.stringify(err));
                                            errCn++;
                                        }
                                        resolve2();
                                    });
                                }
                            }));
                        }
                        Promise.all(promises).then(function() {
                            if (omit.length > 0) {
                                console.log("Segments omittion compleated  for:" + JSON.stringify(omit));

                                if (errCn > 0) {
                                    console.log("Some errors occured while deleting collections");
                                    resolve();
                                }
                                else {
                                    if (save_list_in_database && !DRY_RUN) {
                                        console.log("adding segments to omit list in view document. Only if upgraded to lates version this list will be taken in account on incoming data.");

                                        var unset = {};
                                        for (var z = 0; z < omit.length; z++) {
                                            unset["segments." + omit[z]] = "";
                                        }

                                        countlyDb.collection("views").update({_id: app._id}, {"$addToSet": {"omit": {"$each": omit}}, "$unset": unset}, function(err) {
                                            if (err) {
                                                console.log(err);
                                            }
                                            resolve();
                                        });
                                    }
                                    else {
                                        resolve();
                                    }

                                }
                            }
                            else {
                                console.log("No segments to omit");
                                resolve();
                            }

                        });
                    });
                });
            }).then(function() {
                console.log("completed");
                countlyDb.close();
                return;

            }).catch(function(rejection) {
                console.log("Error");
                console.log("Error:", rejection);
                countlyDb.close();
                return;
            });
        }
        else {
            console.log("exiting as there are no apps to process.");
            countlyDb.close();
            return;
        }
    });


});

function getOmitList(omit, options, callback) {
    if (omit.length === 0) {
        var segmentsToOmit = [];
        options.db.collection("views").find({_id: options.db.ObjectID(options.app_id)}).toArray(function(err, result) {
            if (err) {
                console.log("Error getting omit list");
                callback(err, []);
            }
            else {
                if (result && result.length > 0) {
                    var segCN = 0;
                    result = result[0];

                    for (var seg in result.segments) {
                        segCN++;
                        var cnn = 0;
                        try {
                            cnn = Object.keys(result.segments[seg]).length;
                        }
                        catch (e) {
                            console.log("Error getting segment count for " + seg + " in app " + options.app_id);
                            cnn = 0;
                        }
                        result.segments[seg] = cnn;
                        if (cnn > segmentValueLimit) {
                            segmentsToOmit.push(seg);
                        }

                    }
                    console.log("App +" + options.app_id + " has " + segCN + " segments: " + JSON.stringify(result.segments));
                    if (result.omit && result.omit.length > 0) {
                        console.log("Currently ommited:" + JSON.stringify(result.omit));
                    }
                }
                callback(null, segmentsToOmit);
            }
        });
    }
    else {
        return JSON.parse(JSON.stringify(omit));
    }
}

function getAppList(options, callback) {
    var query = {};
    if (app_list && app_list.length > 0) {
        var listed = [];
        for (var z = 0; z < app_list.length; z++) {
            listed.push(options.db.ObjectID(app_list[z]));
        }
        query = {_id: {$in: listed}};
    }

    try {
        options.db.collection("apps").find(query).toArray(function(err, apps) {
            if (err) {
                console.log("Couldn't get app list in dataviews.getAppList");
                callback(err, []);
            }
            else {
                callback(err, apps);
            }
        });
    }
    catch (err) {
        console.log("Error getting apps: ", err);
        callback(err, []);
    }

}
