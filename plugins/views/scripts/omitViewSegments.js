//Put script in ./countly/plugins/views/omitViewSegments.js
/*
The script deletes data for specific segments in aggregated data. It also can set an omitting list in the database to ensure that segments are also omitted on incoming data.
*/

//to run:
// cd `countly dir`
// node ./plugins/views/scripts/omitViewSegments.js


var crypto = require('crypto');
var pluginManager = require('./../../../plugins/pluginManager.js');
var Promise = require("bluebird");

var app_list = []; //leave empty to process all apps or add specific app ids to the array.
var DRY_RUN = false; //set to true to see what will be deleted without actually deleting anything
var save_list_in_database = true; //If omitting is successful, should list be saved in views setting. If saved in views setting, it will ensure segment not reappearing on incoming data. It will have effect only if upgraded to version at least 23.06.16

var omit = ["Cats", "Dogs"];//list with segments to omit

Promise.all([pluginManager.dbConnection("countly")]).spread(function(countlyDb) {
    if (!Array.isArray(omit) || omit.length === 0) {
        console.log("No segments to omit");
        countlyDb.close();
        return;
    }
    else {
        console.log("Validating app list: ");
        getAppList({db: countlyDb}, function(err, apps) {
            console.log(apps.length + " apps found");
            if (apps && apps.length > 0) {
                Promise.each(apps, function(app) {
                    return new Promise(function(resolve) {
                        console.log("processing app:" + app.name);
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

                                    countlyDb.collection("views").update({_id: app._id}, {$set: {"omit": omit}, "$unset": unset}, function(err) {
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
    }

});

function getAppList(options, callback) {
    var query = {};
    if (app_list && app_list.length > 0) {
        var listed = [];
        for (var z = 0; z < app_list.length; z++) {
            listed.push(options.db.ObjectId(app_list[z]));
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
