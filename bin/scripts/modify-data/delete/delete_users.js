/**
 *  Delete users in bacthes for specific query
 *  Server: countly
 *  Path: countly dir/bin/scripts/modify-data/delete
 *  Command: node delete_users.js
 */

var APP_ID = "5ab0c3ef92938d0e61cf77f4";
var QUERY = {did: {$regex: /test/}};
var BATCH = 1000;

var pluginManager = require('./../../../../plugins/pluginManager.js');
var common = require('./../../../../api/utils/common.js');
var app_users = require('./../../../../api/parts/mgmt/app_users.js');
var asyncjs = require('async');

const readline = require("readline");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

var Promise = require("bluebird");
Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).spread(function(countlyDb, countlyDrill) {
    common.db = countlyDb;
    common.drillDb = countlyDrill;
    app_users.count(APP_ID, QUERY, function(err, res) {
        console.log("deleting", res, "users");
        rl.question("Are you sure ? ", function(answer) {
            if ((answer + "").toLowerCase().trim() === "y") {
                asyncjs.timesSeries(Math.ceil(res / BATCH), function(n, next) {
                    common.db.collection("app_users" + APP_ID).find(QUERY, {_id: 0, uid: 1}).limit(BATCH).toArray(function(err, users) {
                        if (err || !users) {
                            return next(err);
                        }
                        var arr = [];
                        for (var i = 0; i < users.length; i++) {
                            arr.push(users[i].uid);
                        }
                        console.log("deleting batch", n + 1, "from", Math.ceil(res / BATCH));
                        app_users.delete(APP_ID, { uid: {$in: arr}}, function(err) {
                            if (err) {
                                console.log("Error", err);
                            }
                            next();
                        });
                    });
                }, function(err) {
                    console.log("Done", err);
                    countlyDb.close();
                    countlyDrill.close();
                    rl.close();
                });
            }
            else {
                countlyDb.close();
                countlyDrill.close();
                rl.close();
            }
        });
    });
});


