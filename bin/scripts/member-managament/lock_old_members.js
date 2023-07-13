/*
Script should be placed in ./bin/scripts/member-managament/lock_old_members.js

Script locks members, which have not been active for given amount of time;
Query is editable to lock based on different criteria.
*/

var dry_run = true; //if set true, there will be only information outputted about users like that, but deltetion will not be triggered.
var days = 30;

//query states not logged in in last N days , but logged in at least once

var ts = Math.round(Date.now() / 1000) - days * 24 * 60 * 60;
var query = {"$and": [{"last_login": {"$lt": ts}}, {"locked": {"$ne": true}}]};

//although mogodb does not return null on $lt, keep like above for safety

var pluginManager = require('./../../../plugins/pluginManager.js');
var Promise = require("bluebird");

var errored = 0;
if (dry_run) {
    console.log("This is dry run");
    console.log("Members will be only listed, not locked");
}
Promise.all([pluginManager.dbConnection("countly")]).spread(function(countlyDb) {
    countlyDb.collection("members").aggregate([{"$match": query}, {"$project": {"_id": true, "email": true, "username": true, "full_name": true}}], {allowDiskUse: true}, function(err, res) {
        if (err) {
            console.log(err);
        }

        Promise.each(res, function(data) {
            return new Promise(function(resolve) {
                console.log(JSON.stringify(data));
                if (dry_run) {
                    resolve();
                }
                else {
                    countlyDb.collection("members").updateOne({_id: data._id}, {$set: {locked: true}}, function(err) {
                        if (err) {
                            console.log(err);
                            errored++;
                        }
                        resolve();
                    });
                }
            });
        }).then(function() {
            if (errored > 0) {
                console.log(errored + " requests failed");
            }
            console.log("ALL done");
            countlyDb.close();
        }).catch(function(rejection) {
            console.log("Error");
            console.log("Error:", rejection);
            countlyDb.close();
        });
    });


});