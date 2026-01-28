//PUT in list of appIDS you want to export. If none put in - ALL apps will be exported.
var apps = [];
var export_crashes = true; //Set to false if you do not want to export crashes.
var filePath = "./myfolder"; //Path where to output files when export script runs.

var plugins = require('./../../../plugins/pluginManager.ts');
var common = require('../../../api/utils/common.js');
var crypto = require('crypto');
var db;

function getApps(countlyDb, callback) {
    var query = {};
    if (apps.length > 0) {
        var qq = [];
        for (var z = 0; z < apps.length; z++) {
            qq.push(countlyDb.ObjectID(apps[z]));
        }
        query = {"_id": {"$in": qq}};
    }
    countlyDb.collection("apps").find(query).toArray(callback);
}

var generate_events_scripts = function(data) {
    return new Promise(function(resolve, reject) {
        db.collection("events").find({_id: db.ObjectID(data.appid)}).toArray(function(err, res) {
            if (err) {
                reject(Error(err));
                return;
            }
            var scripts = [];
            if (res && res.length > 0) {
                for (var j = 0; j < res.length; j++) {
                    if (res[j].list && res[j].list.length > 0) {
                        for (var z = 0; z < res[j].list.length; z++) {
                            var eventCollName = "events" + crypto.createHash('sha1').update(res[j].list[z] + data.appid).digest('hex');
                            //old data, can be removed once we are sure that we are only using merged events_data collection
                            scripts.push({cmd: 'mongodump', args: [...data.dbargs, '--collection', eventCollName, '--out', data.my_folder, '--gzip']});

                            if (plugins.isPluginEnabled('drill')) {
                                eventCollName = "drill_events" + crypto.createHash('sha1').update(res[j].list[z] + data.appid).digest('hex');
                                scripts.push({cmd: 'mongodump', args: [...data.dbargs_drill, '--collection', eventCollName, '--out', data.my_folder, '--gzip']});
                            }
                        }
                    }
                }
                //new data
                scripts.push({cmd: 'mongodump', args: [...data.dbargs, '--collection', "events_data", '-q', '{ "_id": {"$regex":"^' + data.appid + '_.*"}}', '--out', data.my_folder, '--gzip']});
                if (plugins.isPluginEnabled('drill')) {
                    scripts.push({cmd: 'mongodump', args: [...data.dbargs_drill, '--collection', "drill_events", '-q', '{ "a": "' + data.appid + '"}', '--out', data.my_folder, '--gzip']});
                }
            }
            resolve(scripts);
        }
        );
    });
};

var generate_credentials_scripts = function(data) {
    return new Promise(function(resolve, reject) {
        db.collection("apps").findOne({_id: db.ObjectID(data.appid)}, function(err, res) {
            if (err) {
                reject(Error(err));
                return;
            }
            var cid = [];
            if (res && res.plugins && res.plugins.push) {
                if (res.plugins.push.a && res.plugins.push.a._id) {
                    cid.push('{"$oid":"' + res.plugins.push.a._id + '"}');
                }

                if (res.plugins.push.i && res.plugins.push.i._id) {
                    cid.push('{"$oid":"' + res.plugins.push.i._id + '"}');
                }
            }
            if (cid.length > 0) {
                resolve([{cmd: 'mongodump', args: [...data.dbargs, '--collection', 'credentials', '-q', '{ "_id": {"$in":[' + cid.join(',') + ']}}', '--out', data.my_folder, '--gzip']}]);
            }
            else {
                resolve([]);
            }
        });
    });
};

var createScriptsForViews = function(data) {
    return new Promise(function(resolve/*, reject*/) {
        var scripts = [];
        var appId = data.appid;
        db.collection("views").findOne({'_id': db.ObjectID(appId)}, {}, function(err, viewInfo) {

            var colName = "app_viewdata" + crypto.createHash('sha1').update(appId).digest('hex');
            scripts.push({cmd: 'mongodump', args: [...data.dbargs, '--collection', colName, '--out', data.my_folder, '--gzip']});
            if (viewInfo) {
                for (let segKey in viewInfo.segments) {
                    colName = "app_viewdata" + crypto.createHash('sha1').update(segKey + appId).digest('hex');
                    scripts.push({cmd: 'mongodump', args: [...data.dbargs, '--collection', colName, '--out', data.my_folder, '--gzip']});
                }
            }
            colName = "app_viewdata" + crypto.createHash('sha1').update('platform' + appId).digest('hex');
            scripts.push({cmd: 'mongodump', args: [...data.dbargs, '--collection', colName, '--out', data.my_folder, '--gzip']});
            resolve(scripts);
        });

    });
};

var create_export_scripts = function(data) {
    return new Promise(function(resolve, reject) {
        var appid = data.appid;
        var my_folder = data.my_folder;

        var scripts = [];
        var dbargs = [];
        var dbargs0 = [];
        var countly_db_name = "";
        var db_params = plugins.getDbConnectionParams('countly');
        for (var p in db_params) {
            dbargs.push("--" + p);
            dbargs.push(db_params[p]);
            if (p !== 'db') {
                dbargs0.push("--" + p);
                dbargs0.push(db_params[p]);
            }
            else {
                countly_db_name = db_params[p];
            }
        }

        var dbargs_drill = [];
        db_params = plugins.getDbConnectionParams('countly_drill');
        for (var z in db_params) {
            dbargs_drill.push("--" + z);
            dbargs_drill.push(db_params[z]);
        }

        var dbargs_out = [];
        db_params = plugins.getDbConnectionParams('countly_out');
        for (var g in db_params) {
            dbargs_out.push("--" + g);
            dbargs_out.push(db_params[g]);
        }

        db.collection("apps").findOne({_id: db.ObjectID(appid)}, function(err, res) {
            if (err || !res) {
                reject(Error("data-migration.invalid-app-id"));
            }
            else {
                if (!res.redirect_url || res.redirect_url === "") {
                    scripts.push({cmd: 'mongodump', args: [...dbargs, "--collection", "apps", "-q", '{ "_id": {"$oid":"' + appid + '"}}', "--out", my_folder, '--gzip']});
                }
                else {
                    //remove redirect field and add it after dump.
                    scripts.push({cmd: 'mongo', args: [countly_db_name, ...dbargs0, "--eval", 'db.apps.update({ "_id": ObjectId("' + appid + '")}, { "$unset": { "redirect_url": 1 } })']});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, "--collection", "apps", "-q", '{ "_id": {"$oid":"' + appid + '"}}', "--out", my_folder, '--gzip']});
                    scripts.push({cmd: 'mongo', args: [countly_db_name, ...dbargs0, "--eval", 'db.apps.update({ "_id": ObjectId("' + appid + '")}, { $set: { redirect_url: "' + res.redirect_url + '" } })']});
                }

                var appDocs = ['app_users', 'app_crashgroups', 'app_crashusers', 'app_viewdata', 'app_views', 'app_userviews', 'app_viewsmeta', 'blocked_users', 'campaign_users', 'consent_history', 'crashes_jira', 'event_flows', 'timesofday', 'feedback', 'push_', 'apm', "nps", "survey", "completed_surveys"];
                for (let j = 0; j < appDocs.length; j++) {
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', appDocs[j] + appid, '--out', my_folder, '--gzip']});
                }

                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'campaigndata', '-q', '{ "a": "' + appid + '"}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'campaigns', '-q', '{ "app_id": "' + appid + '"}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'crash_share', '-q', '{ "app_id": "' + appid + '"}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'feedback_widgets', '-q', '{ "app_id": "' + appid + '"}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'notes', '-q', '{ "app_id":"' + appid + '"}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'messages', '-q', '{ "apps": {"$oid":"' + appid + '"}}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'cohortdata', '-q', '{ "a": "' + appid + '"}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'cohorts', '-q', '{ "app_id": "' + appid + '"}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'server_stats_data_points', '-q', '{ "a": "' + appid + '"}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'consent_history', '-q', '{ "app_id": "' + appid + '"}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'flow_schemas', '-q', '{ "app_id": "' + appid + '"}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'flow_data', '-q', '{ "app_id": "' + appid + '"}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'times_of_day', '-q', '{ "app_id": "' + appid + '"}', '--out', my_folder, '--gzip']});

                //concurrent_users
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'concurrent_users_max', '-q', '{"$or":[{ "app_id": "' + appid + '"},{ "_id": {"$in" :["' + appid + '_overall", "' + appid + '_overall_new"]}}]}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'concurrent_users_alerts', '-q', '{ "app": "' + appid + '"}', '--out', my_folder, '--gzip']});


                var sameStructures = ["browser", "carriers", "cities", "consents", "crashdata", "density", "device_details", "devices", "langs", "sources", "users", "retention_daily", "retention_weekly", "retention_monthly", "server_stats_data_points"];

                for (var k = 0; k < sameStructures.length; k++) {
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', sameStructures[k], '-q', '{ "_id": {"$regex": "^' + appid + '_.*" }}', '--out', my_folder, '--gzip']});
                }
                if (dbargs_out && dbargs_out.length) {
                    scripts.push({cmd: 'mongodump', args: [...dbargs_out, '--collection', "ab_testing_experiments" + appid, '--out', my_folder, '--gzip']});
                    scripts.push({cmd: 'mongodump', args: [...dbargs_out, '--collection', "remoteconfig_parameters" + appid, '--out', my_folder, '--gzip']});
                    scripts.push({cmd: 'mongodump', args: [...dbargs_out, '--collection', "remoteconfig_conditions" + appid, '--out', my_folder, '--gzip']});
                }

                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'max_online_counts', '-q', '{"_id": {"$oid":"' + appid + '"}}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'top_events', '-q', '{ "app_id": {"$oid":"' + appid + '"}}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'events', '-q', '{ "_id": {"$oid":"' + appid + '"}}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'views', '-q', '{ "_id": {"$oid":"' + appid + '"}}', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'funnels', '-q', '{ "app_id": "' + appid + '" }', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'calculated_metrics', '-q', '{ "app": "' + appid + '" }', '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'datamanager_transforms', '-q', '{ "app": "' + appid + '" }', '--out', my_folder, '--gzip']});


                //event Timeline data:
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'eventTimes' + appid, '--out', my_folder, '--gzip']});
                scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'timelineStatus', '-q', '{ "app_id": "' + appid + '" }', '--out', my_folder, '--gzip']});

                //internal events
                for (let j = 0; j < plugins.internalEvents.length; j++) {
                    let eventCollName = "events" + crypto.createHash('sha1').update(plugins.internalEvents[j] + appid).digest('hex');
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', eventCollName, '--out', my_folder, '--gzip']});
                }

                if (plugins.isPluginEnabled('drill')) {
                    //export drill
                    var drill_events = plugins.internalDrillEvents;

                    for (let j = 0; j < drill_events.length; j++) {
                        let eventCollName = "drill_events" + crypto.createHash('sha1').update(drill_events[j] + appid).digest('hex');
                        scripts.push({cmd: 'mongodump', args: [...dbargs_drill, '--collection', eventCollName, '--out', my_folder, '--gzip']});
                    }

                    scripts.push({cmd: 'mongodump', args: [...dbargs_drill, '--collection', 'drill_bookmarks', '-q', '{ "app_id": "' + appid + '" }', '--out', my_folder, '--gzip']});
                    scripts.push({cmd: 'mongodump', args: [...dbargs_drill, '--collection', 'drill_meta' + appid, '--out', my_folder, '--gzip']});
                    scripts.push({cmd: 'mongodump', args: [...dbargs_drill, '--collection', 'drill_meta', '-q', '{ "_id": {"$regex": "^' + appid + '_.*" }}', '--out', my_folder, '--gzip']});
                }
                //export symbolication files
                if (data.aditional_files) {
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'app_crashsymbols' + appid, '--out', my_folder, '--gzip']});
                    scripts.push({cmd: 'mongodump', args: [...dbargs, '--collection', 'symbolication_jobs', '-q', '{ "app_id": "' + appid + '" }', '--out', my_folder, '--gzip']});
                }

                //events sctipts
                generate_events_scripts({appid: appid, my_folder: my_folder, dbargs: dbargs, dbargs_drill: dbargs_drill})
                    .then(
                        function(result) {
                            if (result && Array.isArray(result)) {
                                scripts = scripts.concat(result);
                            }

                            return generate_credentials_scripts({appid: appid, my_folder: my_folder, dbargs: dbargs, dbargs_drill: dbargs_drill});
                        })
                    .then(
                        function(result) {
                            if (result && Array.isArray(result)) {
                                scripts = scripts.concat(result);
                            }

                            return createScriptsForViews({appid: appid, my_folder: my_folder, dbargs: dbargs, dbargs_drill: dbargs_drill});
                        })
                    .then(
                        function(result) {
                            if (result && Array.isArray(result)) {
                                scripts = scripts.concat(result);
                            }
                            return resolve(scripts);
                        },
                        function(error) {
                            reject(Error(error.message));
                        }
                    ).catch(err1 => {
                        reject(err1);
                    });
            }
        });
    });
};

Promise.all([plugins.dbConnection("countly"), plugins.dbConnection("countly_drill")]).then(function([countlyDb, drillDb]) {
    common.drillDb = drillDb;
    common.db = countlyDb;
    db = countlyDb;
    plugins.loadConfigs(countlyDb, function() {
        getApps(countlyDb, async function(err, apps) {
            if (err) {
                console.log(err);
                console.log("exiting");
                countlyDb.close();
                drillDb.close();
                return;
            }
            apps = apps || [];

            if (apps.length === 0) {
                console.log("0 apps found");
                console.log("exiting");
                countlyDb.close();
                drillDb.close();
                return;
            }
            else {
                try {
                    // Process apps sequentially with native promises
                    const results = [];
                    for (const app of apps) {
                        const result = await create_export_scripts({
                            appid: app._id + "",
                            my_folder: filePath,
                            aditional_files: export_crashes
                        });
                        results.push(result);
                    }

                    for (var k = 0; k < results.length; k++) {
                        console.log("#Scripts for app " + apps[k]._id + ":");
                        for (var j = 0; j < results[k].length; j++) {
                            console.log(results[k][j].cmd + " '" + results[k][j].args.join("' '") + "'");
                        }

                    }
                    console.log("# Completed generating export commands.");
                    countlyDb.close();
                    drillDb.close();
                }
                catch (error) {
                    console.log(error);
                    countlyDb.close();
                    drillDb.close();
                }
            }
        });
    });
});
