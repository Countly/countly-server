/*
* Scrript triggers data regeneration for events and sessions.
* It stores progress in county.data_regeneration_progress collection. 
* Collection can be dropped once regeneration is complete. Data in there ensures that if script dies unexpectedly, then upon staring again it will not regenerate collections again.
*   mongosh countly
*   db.data_regeneration_progress.drop();
*
*   script path: {countly}/bin/scripts/fix-data/
*
* To run script:
*   node regenerate_aggregated_data.js
*/
//Adjust settings below before running script
var regenerate_events = true; //if true will regenerate all custom events aggregated data
var regenerate_sessions = false;
var period = "732days"; //any valid period

//Each app IDis listed as string, for example var appList = ["6075f94b7e5e0d392902520c",6075f94b7e5e0d392902520d]
var appList = [];//If left empty, will run for all apps.
//For each app defined there only listed events will be regenerated. If left empty, all events will be regenerated.
//Example var eventMap = {"6075f94b7e5e0d392902520c":["Logout","Login"],"6075f94b7e5e0d392902520d":["Logout","Login","Buy"]};
var eventMap = {}; //If left empty will run for all alls/events.


//End of adjustable settings

const common = require("../../../api/utils/common.js");
const pluginManager = require('../../../plugins/pluginManager.js');
const asyncjs = require('async');
const drill = require('../../../plugins/drill/api/parts/data/drill.js');

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).then(async function([countlyDb, drillDb]) {
    console.log("Connected to databases...");
    common.db = countlyDb;
    common.drillDb = drillDb;
    //get all apps
    try {
        var query = {};
        if (appList && appList.length) {
            query._id = {$in: appList.map(app_id=>common.db.ObjectID(app_id))};
        }
        const apps = await countlyDb.collection("apps").find(query, {_id: 1, name: 1, timezone: 1}).toArray();

        await new Promise((resolve)=>{
            common.plugins.loadConfigs(countlyDb, function() {
                resolve();
            });
        });
        if (!apps || !apps.length) {
            return close();
        }
        try {
            //for each app serially process users
            asyncjs.eachSeries(apps, async function(app) {
                console.log("Processing app: ", app.name);
                //get all drill collections for this app
                var skipped_ec = 0;
                if (regenerate_events) {
                    var events = await countlyDb.collection("events").findOne({_id: app._id}, {'list': 1});
                    if (events && events.list && events.list.length) {
                        events.list = events.list.filter(function(ee) {
                            if (ee.indexOf("[CLY]_") === 0) {
                                return false;
                            }
                            else if (eventMap && eventMap[app._id + ""]) {
                                return eventMap[app._id + ""].indexOf(ee) > -1;
                            }
                            else {
                                return true;
                            }
                        });
                        for (var z = 0; z < events.list.length; z++) {
                            var qq = {_id: app._id + ""};
                            qq[events.list[z]] = {$exists: true};
                            var doc = await countlyDb.collection("data_regeneration_progress").findOne(qq);
                            if (!doc) {
                                var event = events.list[z];
                                console.log("      Processing event: ", event);
                                var params = {
                                    appTimezone: app.timezone,
                                    time: common.initTimeObj(app.timezone),
                                    qstring: {
                                        app_id: app._id + "",
                                        event: event,
                                        period: period
                                    }
                                };
                                try {
                                    await new Promise((resolve)=>{
                                        drill.calculateEvents(params, function() {
                                            resolve();
                                        });
                                    });
                                    var update = {};
                                    update[event] = Date.now();
                                    await countlyDb.collection("data_regeneration_progress").updateOne({_id: app._id + ""}, {"$set": update}, {"upsert": true});

                                }
                                catch (err) {
                                    console.log(err);
                                }
                            }
                            else {
                                skipped_ec++;
                            }
                        }
                    }
                    else {
                        console.log("      No events found for app: ", app.name);
                    }
                    if (skipped_ec) {
                        console.log("      Skipped ", skipped_ec, " events as they are marked as recalculated");
                    }
                }
                if (regenerate_sessions) {
                    var doc2 = await countlyDb.collection("data_regeneration_progress").findOne({_id: app._id + "", "[CLY]_session": {$exists: true}});
                    if (!doc2) {
                        console.log("      Processing sessions");
                        var params2 = {
                            appTimezone: app.timezone,
                            time: common.initTimeObj(app.timezone),
                            qstring: {
                                app_id: app._id + "",
                                period: period
                            }
                        };
                        try {
                            await new Promise((resolve)=>{
                                drill.calculateSessions(params2, function() {
                                    resolve();
                                });
                            });
                            await countlyDb.collection("data_regeneration_progress").updateOne({_id: app._id + ""}, {"$set": { "[CLY]_session": Date.now()}}, {"upsert": true});
                        }
                        catch (err) {
                            console.log(err);
                        }
                    }
                    else {
                        console.log("      Sessions already processed for app: ", app.name);
                    }
                }

            }, function(err) {
                return close(err);
            });
        }
        catch (err) {
            return close(err);
        }
    }
    catch (err) {
        return close(err);
    }

    function close(err) {
        if (err) {
            console.log(err);
            console.log('EXITED WITH ERROR');
        }
        console.log("Closing connections...");
        countlyDb.close();
        drillDb.close();
        console.log("DONE");
    }

});