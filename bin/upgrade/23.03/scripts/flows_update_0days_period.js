/**
 *  Modifies all occurances of 0days to last 12 months for flows
 *  Server: countly
 *  Path: countly dir/bin/scripts/fix-data/flows_update_0days_period
 *  Command: node flows_update_0days_period.js
 */

var app_list = [];//add app ids, if none added will run on all apps

var pluginManager = require('./../../../../plugins/pluginManager.js');
var Promise = require("bluebird");

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

async function context() {
    const countlyDb = await pluginManager.dbConnection("countly");
    getAppList({db: countlyDb}, async function(err, apps) {
        await Promise.allSettled(apps.map(async(appId) => {
            try {
                const dbResult = await countlyDb.collection("flowSchema" + appId).updateMany({"period": "0days"}, {$set: {"period": "12months"}});
                console.log(dbResult.modifiedCount + " records updated for " + appId, " application");
            }
            catch (err) {
                console.log('Error occured: ', err, ' for ', appId, ' application.');
            }
        }));
        countlyDb.close();
        console.log('All done!');
    });
}

context();
