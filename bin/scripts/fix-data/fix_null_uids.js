/**
 *  Script runs queries to try to determine if there are any app_user documents without uid.
 *  In dry mode it just outputs information
 *  If dry_run is set to false, then app_users documents are fixed right away. Fixing includes deleting documents that were not matched. It is suggested to run in dry_run=true first to make sure nothing unexpected gets deleted.
 *  Server: countly
 *  Path: $(countly dir)/bin/scripts/fix-data
 *  Command: node fix_null_uids.js
 */
const pluginManager = require('../../../plugins/pluginManager.js'),
    crypto = require('crypto');
var Promise = require("bluebird");

console.log('looking for users without uid');
var dry_run = true;
var results = {};
var apps = [];

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    var query = {};
    if (apps.length > 0) {
        for (var k = 0;k < apps.length;k++) {
            apps[k] = countlyDb.ObjectID(apps[k]);
        }
        query = {_id: {$in: apps}};
    }

    countlyDb.collection('apps').find(query).toArray(function(err, apps) {
        apps = apps || [];
        console.log(apps.length + " apps found");
        Promise.each(apps, function(app) {
            return new Promise(function(resolveApp, rejectApp) {
                console.log("Running for:" + app.name + "(" + app._id + ")");
                countlyDb.collection("app_users" + app._id).find({uid: {$exists: false}}, {"uid": 1, "_id": 1, "last_req_post": 1, "last_req_get": 1}).toArray(function(err, users) {
                    if (err) {
                        console.log(err);
                        resolveApp();
                    }
                    else {
                        users = users || [];
                        console.log("Users without uid: " + users.length);
                        if (users.length > 0) {
                            Promise.each(users, function(user) {
                                return new Promise(function(resolve) {
                                    var device_id;
                                    var events = [];
                                    if (user.did) {
                                        device_id = user.did;
                                    }
                                    var props = ["last_req_post", "last_req_get"];
                                    for (var z = 0; z < props.length; z++) {
                                        if (user[props[z]]) {
                                            //Request. Try splitting by props.
                                            //look for ?
                                            var kk = user[props[z]].indexOf("?");
                                            var val = user[props[z]].substring(kk + 1);
                                            var pairs = val.split("&");
                                            for (var j = 0; j < pairs.length; j++) {
                                                var pair = pairs[j].split("=");
                                                if (pair[0] === "device_id" && !device_id) {
                                                    device_id = pair[1];
                                                }
                                                else if (pair[0] === "events") {
                                                    //decode url
                                                    try {
                                                        pair[1] = decodeURIComponent(pair[1]);
                                                        var jsonVal = JSON.parse(pair[1]);
                                                        if (jsonVal.length > 0) {
                                                            for (var k = 0; k < jsonVal.length; k++) {
                                                                events.push({"ts": jsonVal[k].ts, "key": jsonVal[k].key});
                                                            }
                                                        }
                                                    }
                                                    catch (ee) {
                                                        console.log(ee);
                                                    }
                                                }
                                            }
                                            if (events.length === 0) {
                                                events.push({ "key": "[CLY]_session"});
                                            }

                                        }
                                    }
                                    if (device_id) {
                                        var updated = false;
                                        //Try finding any drill document with this device id
                                        Promise.each(events, function(event) {
                                            return new Promise(function(resolve1) {
                                                if (updated) {
                                                    resolve1();
                                                }
                                                else {
                                                    var collection = "drill_events" + crypto.createHash('sha1').update(event.key + app._id).digest('hex');
                                                    drillDb.collection(collection).aggregate([{$match: {did: device_id, uid: {"$exists": true}}}, {"$sort": {"ts": -1}}, {$limit: 1}, {$project: {did: 1, uid: 1}}], {"allowDiskUse": true}, function(err, res) {
                                                        if (err) {
                                                            console.log(err);
                                                            resolve1();
                                                        }
                                                        else {
                                                            if (res && res.length > 0) {
                                                                res = res[0];
                                                                //if this uid does not exist - update doc, else - delete this null doc
                                                                countlyDb.collection("app_users" + app._id).findOne({uid: res.uid}, function(err3, res2) {
                                                                    if (err3) {
                                                                        console.e(err3);
                                                                    }
                                                                    else {
                                                                        if (res2) {
                                                                            results[app._id] = results[app._id] || {};
                                                                            results[app._id].delete_duplicate = results[app._id].delete_duplicate || [];
                                                                            results[app._id].delete_duplicate.push(user._id);
                                                                            if (!dry_run) {
                                                                                //delete document as there is alredy one with correct uid
                                                                                countlyDb.collection("app_users" + app._id).remove({_id: user._id}, function(err4) {
                                                                                    if (err4) {
                                                                                        console.log(err4);
                                                                                    }
                                                                                    resolve1();
                                                                                });
                                                                            }
                                                                            else {
                                                                                resolve1();
                                                                            }
                                                                        }
                                                                        else {
                                                                            results[app._id] = results[app._id] || {};
                                                                            results[app._id].update = results[app._id].update || [];
                                                                            results[app._id].update.push([{"_id": user._id}, {"$set": {"uid": res.uid}}]);
                                                                            if (!dry_run) {
                                                                                //update document with correct uid
                                                                                countlyDb.collection("app_users" + app._id).update({_id: user._id}, {$set: {uid: res.uid}}, function(err4) {
                                                                                    if (err4) {
                                                                                        console.log(err4);
                                                                                    }
                                                                                    resolve1();
                                                                                });
                                                                            }
                                                                            else {
                                                                                console.log("db.app_users" + app._id + ".updateOne({\"_id\":\"" + user._id + "\"}, {\"$set\": {\"uid\": \"" + res.uid + "\"}})");
                                                                                resolve1();
                                                                            }

                                                                        }
                                                                        updated = true;
                                                                    }
                                                                });
                                                            }
                                                            else {
                                                                resolve1();
                                                            }
                                                        }
                                                    });
                                                }
                                            });
                                        }).then(function() {
                                            if (!updated) {
                                                results[app._id] = results[app._id] || {};
                                                results[app._id].delete = results[app._id].delete || [];
                                                results[app._id].delete.push(user._id);
                                                if (!dry_run) {
                                                    countlyDb.collection("app_users" + app._id).remove({_id: user._id}, function(err8) {
                                                        if (err8) {
                                                            console.log(err8);
                                                        }
                                                        resolve();
                                                    });
                                                }
                                                else {
                                                    resolve();
                                                }
                                            }
                                            else {
                                                resolve();
                                            }
                                        }).catch(function(error) {
                                            console.log(error);
                                            resolve();
                                        });
                                    }
                                    else {
                                        results[app._id] = results[app._id] || {};
                                        results[app._id].delete = results[app._id].delete || [];
                                        results[app._id].delete.push(user._id);
                                        if (!dry_run) {
                                            countlyDb.collection("app_users" + app._id).remove({_id: user._id}, function(err8) {
                                                if (err8) {
                                                    console.log(err8);
                                                }
                                                resolve();
                                            });
                                        }
                                        else {
                                            resolve();
                                        }
                                    }
                                });
                            }).then(function() {
                                resolveApp();
                            }).catch(function(error) {
                                rejectApp(error);
                            });
                        }
                        else {
                            resolveApp();
                        }
                    }
                });
            });

        }).then(function() {
            if (dry_run) {
                for (var app in results) {
                    console.log("App: " + app);
                    for (var key in results[app]) {
                        if (key === "update") {
                            console.log("-------------Updates----------------");
                            for (var i = 0; i < results[app][key].length; i++) {
                                console.log("db.app_users" + app + ".updateOne(" + JSON.stringify(results[app][key][i][0]) + "," + JSON.stringify(results[app][key][i][1]) + ")");
                            }
                        }
                        else {
                            console.log("-------------" + key + "----------------");
                            console.log(JSON.stringify(results[app][key]));

                        }
                    }
                }
            }
            console.log("Done");
            countlyDb.close();
            drillDb.close();
        }).catch(function(error) {
            console.log(error);
            console.log("Exiting with errors");
            if (dry_run) {
                for (var app in results) {
                    console.log("App: " + app);
                    for (var key in results[app]) {
                        if (key === "update") {
                            console.log("-------------Updates----------------");
                            for (var i = 0; i < results[app][key].length; i++) {
                                console.log("db.app_users" + app + ".updateOne(" + JSON.stringify(results[app][key][i][0]) + "," + JSON.stringify(results[app][key][i][1]) + ")");
                            }
                        }
                        else {
                            console.log("-------------" + key + "----------------");
                            console.log(JSON.stringify(results[app][key]));

                        }
                    }
                }
            }
            countlyDb.close();
            drillDb.close();
        });
    });
});