//Fix push 

var pluginManager = require('./../../../plugins/pluginManager.js');
var Promise = require("bluebird");

var app_list = [];//add app ids, if none added will run on all apps

var dry_run = true;

console.log("Script clears push tokens if same token is for mutiple users. Keeping only for user with highest value for lac or ls");
console.log("Can be called multiple times. On each run checks current state in database");
if (dry_run) {
    console.log("This is dry run");
    console.log("Nothing will be cleared");
}

function clearing_out(options, callback) {
    if (options.data && options.data.length > 0) {
        if (dry_run) {
            console.log("not needed docs in push: " + JSON.stringify(options.data));
            callback();
        }
        else {
            options.db.collection("push_" + options.appId).remove({"_id": {"$in": options.data}}, {"multi": true}, function(err6) {
                if (err6) {
                    console.log(err6);
                }
                callback();
            });
        }
    }
    else {
        callback();
    }
}

Promise.all([pluginManager.dbConnection("countly")]).spread(function(countlyDb) {
    getAppList({db: countlyDb}, function(err, apps) {
        if (err) {
            console.log(err);
            console.log("exiting with error");
        }
        else {
            Promise.each(apps, function(appId) {
                return new Promise(function(resolve, reject) {
                    console.log("Processing app " + appId);
                    console.log("Looking for duplicates (Could take a bit long)");

                    var pipeline = [{"$match": {"tk": {"$ne": {}}}}, {"$project": {"_id": true, "tk": {"$objectToArray": "$tk"}}}, {"$unwind": "$tk"}, {"$group": {"_id": "$tk", "uid": {"$addToSet": "$_id"}}}, {"$addFields": {"cn": {"$size": "$uid"}}}, {"$match": {"cn": {"$gt": 1}}}];

                    countlyDb.collection("push_" + appId).aggregate(pipeline, function(err, res) {
                        if (err) {
                            console.log(err);
                            reject();
                        }
                        else {
                            if (res && res.length > 0) {
                                console.log("found " + res.length + " tokens with multiple owners");
                                Promise.each(res, function(data) {
                                    return new Promise(function(resolve1, reject1) {
                                        countlyDb.collection("app_users" + appId).aggregate([{"$match": {"uid": {"$in": data.uid}}}, {"$project": {"_id": true, "uid": true, "lac": true, "ls": true}}], function(err2, res2) {
                                            if (err2) {
                                                console.log(err2);
                                                reject1();
                                            }
                                            else {
                                                var delete_us = [];
                                                if (res2.length !== data.uid.length) {
                                                    console.log("there are some uids not having docs in app_users");
                                                    for (var k = 0; k < data.uid.length; k++) {
                                                        var not_found = true;
                                                        for (var j = 0; j < res2.length; j++) {
                                                            if (res2[j].uid === data.uid[k]) {
                                                                not_found = false;
                                                            }
                                                        }
                                                        if (not_found) {
                                                            delete_us.push(data.uid[k]);
                                                        }
                                                    }
                                                }
                                                clearing_out({db: countlyDb, appId: appId, data: delete_us}, function() {
                                                    if (res2.length > 0) {
                                                        var uid = res2[0].uid;
                                                        var bestValue = res2[0].lac || res2[0].ls;
                                                        for (var k = 1; k < res2.length; k++) {
                                                            var vv = res2[k].lac || res2[k].ls;
                                                            if (vv > bestValue) {
                                                                bestValue = vv;
                                                                uid = res2[k].uid;
                                                            }
                                                        }
                                                        var copy = [];
                                                        var copyUid = [];
                                                        for (var k2 = 0; k2 < res2.length; k2++) {
                                                            if (res2[k2].uid !== uid) {
                                                                copy.push(res2[k2]._id);
                                                                copyUid.push(res2[k2].uid);
                                                            }
                                                        }
                                                        if (copy.length > 0) {
                                                            if (dry_run) {
                                                                console.log("Should remove token " + data["_id"]["k"] + " for users: " + JSON.stringify(copyUid));
                                                                console.log("Should keep for : " + uid);
                                                                resolve1();
                                                            }
                                                            else {
                                                                var uu = {};
                                                                uu["tk" + data["_id"]["k"]] = "";
                                                                countlyDb.collection("app_users" + appId).update({"_id": {"$in": copy}}, {"$unset": uu}, {"multi": true}, function(err4) {
                                                                    if (err4) {
                                                                        console.log(err4);
                                                                    }
                                                                    var uu2 = {};
                                                                    uu2["tk." + data["_id"]["k"]] = "";
                                                                    countlyDb.collection("push_" + appId).update({"_id": {"$in": copyUid}}, {"$unset": uu2}, {"multi": true}, function(err5) {
                                                                        if (err5) {
                                                                            console.log(err5);
                                                                        }
                                                                        resolve1();
                                                                    });
                                                                });
                                                            }
                                                        }
                                                        else {
                                                            resolve1();
                                                        }
                                                    }
                                                    else {
                                                        resolve1();
                                                    }
                                                });
                                            }
                                        });
                                    });
                                }).then(function() {
                                    console.log("Processed");
                                    resolve();
                                }).catch(function(rejection) {
                                    console.log(rejection);
                                    resolve();
                                });
                            }
                            else {
                                console.log("Nothing to fix");
                                resolve();
                            }
                        }
                    });
                });
            }).then(function() {
                console.log("ALL done");
                countlyDb.close();
            }).catch(function(rejection) {
                console.log("Error");
                console.log("Error:", rejection);
                countlyDb.close();
            });
        }
    });
});

function getAppList(options, callback) {
    if (app_list && app_list.length > 0) {
        callback(null, app_list);
    }
    else {
        options.db.collection("apps").find({}).toArray(function(err, myapps) {
            var apps = [];
            if (err) {
                console.log("Couldn't get app list");
                callback(err, []);
            }
            else {
                for (var k = 0; k < myapps.length; k++) {
                    apps.push(myapps[k]._id);
                }

            }
            callback(err, apps);
        });
    }
}
