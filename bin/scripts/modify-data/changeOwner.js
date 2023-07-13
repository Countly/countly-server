/**
 *  Change ownershup of everything form one dashboard user to another
 *  Server: countly
 *  Path: countly dir/bin/scripts/modify-data
 *  Command: node changeOwner.js
 */

var NEW_ID = "582dc01f75e10d33007e7adb"; //Id for new user
var OLD_ID = "59832c06c5e80024b5e1fa1f"; //Id for old user

var pluginManager = require('./../../../plugins/pluginManager');
var common = require('./../../../api/utils/common');
var async = require('async');

pluginManager.dbConnection("countly").then((db) => {
    common.db = db;

    function changeOwner(NEW_ID, OLD_ID, done) {
        changeOwnerDashboard(NEW_ID, OLD_ID, function() {
            common.db.collection("alerts").update({createdBy: OLD_ID}, {$set: {createdBy: NEW_ID}}, function(err, res) {
                console.log("alerts", err, res && res.result);
                common.db.collection("auth_tokens").update({owner: OLD_ID}, {$set: {owner: NEW_ID}}, function(err, res) {
                    console.log("auth_tokens", err, res && res.result);
                    common.db.collection("calculated_metrics").update({owner_id: OLD_ID}, {$set: {owner_id: NEW_ID}}, function(err, res) {
                        console.log("calculated_metrics", err, res && res.result);
                        common.db.collection("concurrent_users_alerts").update({created_by: OLD_ID}, {$set: {created_by: NEW_ID}}, function(err, res) {
                            console.log("concurrent_users_alerts", err, res && res.result);
                            common.db.collection("data_migrations").update({userid: OLD_ID}, {$set: {userid: NEW_ID}}, function(err, res) {
                                console.log("data_migrations", err, res && res.result);
                                changeOwnerLongTasks(NEW_ID, OLD_ID, function(err, res) {
                                    console.log("messages", err, res && res.result);
                                    common.db.collection("messages").update({creator: OLD_ID}, {$set: {creator: NEW_ID}}, function(err, res) {
                                        console.log("messages", err, res && res.result);
                                        common.db.collection("notes").update({owner: OLD_ID}, {$set: {owner: NEW_ID}}, function(err, res) {
                                            console.log("notes", err, res && res.result);
                                            common.db.collection("reports").update({user: OLD_ID}, {$set: {user: NEW_ID}}, function(err, res) {
                                                console.log("reports", err, res && res.result);
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    function changeOwnerDashboard(NEW_ID, OLD_ID, done) {
        common.db.collection("dashboards").find({}).toArray(function(err, dashboards) {
            if (err || !dashboards || !dashboards.length) {
                console.log("Error while fetching dashboards.");
                done();
            }

            async.map(dashboards, iterator, function(err) {
                if (err) {
                    console.log("Owner id update failed.");
                    done();
                }

                console.log("All owners id updated successfully.");

                done();
            });

            function iterator(dash, done) {
                if (!dash || dash.owner_id + "" !== OLD_ID) {
                    return done();
                }

                var update = {
                    $set: {
                        owner_id: NEW_ID,
                        old_owner_id: OLD_ID
                    }
                };

                common.db.collection("dashboards").update({_id: dash._id}, update, function(err) {
                    if (err) {
                        console.log("Error while updating dashboard ", JSON.stringify(dash));
                        console.log("Error message ", err.message);
                        return done(true);
                    }

                    return done(null);
                });
            }
        });
    }

    function changeOwnerLongTasks(NEW_ID, OLD_ID, done) {
        common.db.collection("members").findOne({"_id": common.db.ObjectID(NEW_ID)}, function(err, member) {
            if (err) {
                console.log(err);
                done();
                return;
            }
            if (!member || !member.api_key) {
                console.log("Member with given id doesn't exist");
                done();
                return;
            }
            var newApiKey = member.api_key;
            common.db.collection("long_tasks").find({'creator': OLD_ID}).toArray(function(err, res) {
                var cn = 0;
                if (err) {
                    console.log(err);
                    done();
                }
                else {
                    res = res || [];
                    Promise.each(res, function(item) {
                        return new Promise(function(resolve) {
                            if (item.request) {
                                var reqData = {};
                                try {
                                    reqData = JSON.parse(item.request);
                                    if (reqData.json && reqData.json.api_key) {
                                        reqData.json.api_key = newApiKey;
                                        item.request = JSON.stringify(reqData);
                                    }
                                }
                                catch (ex) {
                                    reqData = {};
                                }
                            }
                            common.db.collection("long_tasks").update({_id: item._id}, {$set: {"creator": NEW_ID, request: item.request}}, function() {
                                cn++;
                                resolve();
                            });
                        });
                    }).then(function() {
                        console.log(cn + " records updated");
                        done();
                    });
                }
            });
        });
    }

    changeOwner(NEW_ID, OLD_ID, function() {
        common.db.close();
    });
});