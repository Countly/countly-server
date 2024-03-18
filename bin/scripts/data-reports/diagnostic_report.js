/*
Script runs queries to try determining if there are any signs of issues.

*/
var Promise = require("bluebird");
const pluginManager = require('../../../plugins/pluginManager.js');

var settings = {
    "reports": {
        "run": true,
        "interval": 2 * 24 * 60 * 60 * 1000
    },
    "merges": {
        "run": true,
        "minimal_count_per_app": 10
    },
    "flows": {
        "run": true,
        "duration": 6000, //10 minutes
        "periodLength": 24 * 60 * 60
    },
    "views": {
        "run": true,
        "view_count": 10000, //App will appear in report if it will have more different views than this limit
        "segment_value_limit": 100, //limit of different segment values it is wanted to keep.
        "segment_limit": 100 //How many different segments it is expected to be there normally.
    },
    "system": {
        "run": true
    }
};

function fetchSystemInfo(db, callback) {
    if (settings && settings.system && settings.system.run) {
        console.log("--SYSTEM--");
        db.collection("diagnostic").find({}).toArray(function(err, diagnostics) {
            if (err) {
                console.log(err);
            }
            else {
                console.log(JSON.stringify(diagnostics));
            }
            callback();

        });
    }
    else {
        callback();
    }


}
function validate_views(db, callback) {
    if (settings && settings.views && settings.views.run === true) {
        //check if there are any views which have a lot of segments
        console.log("--VIEWS--");
        db.collection('views').find({}).toArray(function(err, views) {
            if (err) {
                console.log(err);
            }
            var report = {};
            views = views || [];
            var listed = [];

            for (var k = 0; k < views.length; k++) {
                listed.push(views[k]._id + "");
                var sgc = 0;
                for (var seg in views[k].segments) {
                    sgc += 1;
                    if (Object.keys(views[k].segments[seg]).length > settings.views.segment_value_limit) {
                        report[views[k]._id] = report[views[k]._id] || {};
                        report[views[k]._id].suggested_omits = report[views[k]._id].suggested_omits || [];
                        report[views[k]._id].suggested_omits.push(seg);
                    }
                }
                if (sgc > settings.views.segment_limit) {
                    report[views[k]._id] = report[views[k]._id] || {};
                    report[views[k]._id].segment_count = sgc;
                }
            }

            Promise.each(listed, function(iid) {
                return new Promise(function(resolve) {
                    db.collection("app_viewsmeta" + iid).count(function(err, count) {
                        if (err) {
                            console.log(err);
                        }
                        if (count && count > settings.views.view_count) {
                            report[iid] = report[iid] || {};
                            report[iid].count = count || 0;
                        }
                        resolve();
                    });
                });
            }).then(function() {
                if (Object.keys(report).length > 0) {
                    console.log(JSON.stringify(report));
                }
                else {
                    console.log("Views meta is in order.");
                }
                callback();
            }).catch(function(err) {
                console.log("Error: " + err);
                callback();
            });
        });
    }
    else {
        callback();
    }
}

function validate_reports(db, callback) {
    if (settings && settings.reports && settings.reports.run) {
        //Get report data with ususual error messages.
        console.log("--REPORTS--");
        db.collection('long_tasks').find({"errormsg": {"$nin": ["", "Task was killed during server restart."]}}, {"request": 1, data: 1, errormsg: 1, "ts": 1, "end": 1}).toArray(function(err, reports) {
            if (reports && reports.length) {
                console.log("Reports with bad error messages:");
                console.log(JSON.stringify(reports));
            }
            else {
                console.log("No reports with unusual error messages");
            }
            //Get report count that have been stopped on restart vs total report count
            db.collection('long_tasks').find({"errormsg": "Task was killed during server restart."}).count(function(err, count) {
                db.collection('long_tasks').find({}).count(function(err, total) {
                    console.log("Reports killed on restart: " + count + "/" + total);
                    //Get reports that have not been regenerated in a while
                    callback();
                });
            });
        });
    }
    else {
        callback();
    }
}

function validate_user_profiles(db, callback) {
    var data = {};

    db.collection('apps').find({}).toArray(function(err, apps) {
        if (err) {
            console.log(err);
        }
        apps = apps || [];
        Promise.each(apps, function(app) {
            return new Promise(function(resolve) {
                //get flow count
                //get duplicate uids
                db.collection('app_users' + app._id).aggregate([{"$group": {"_id": "$uid", "cn": {"$sum": 1}}}, {"$match": {"cn": {"$gt": 1}}}, {"$sort": {"cn": -1}}]).toArray(function(err, list) {
                    if (err) {
                        console.log(err);
                    }
                    //list with duplicated uids
                    list = list || [];
                    if (list.length > 0) {
                        data[app._id] = data[app._id] || {};
                        data[app._id].duplicates = list;
                    }
                    //get top merges count
                    var now = Math.floor(Date.now().valueOf() / 1000);
                    now = now - 30 * 24 * 60 * 60;
                    //get top merges count for users that have been there in last 30 days
                    db.collection('app_users' + app._id).aggregate([{"$match": {"lac": {"$gt": now}, "merges": {"$gt": 0}}}, {"$sort": {"merges": -1}}, {"$limit": 10}, {"$project": {"lac": 1, "merges": 1, "_id": 1, "uid": 1}}]).toArray(function(err, list) {
                        if (err) {
                            console.log(err);
                        }
                        if (list.length > 0) {
                            data[app._id] = data[app._id] || {};
                            data[app._id].top_merges = list;
                        }
                        resolve();
                    });
                });
            });
        }).then(function() {
            console.log("--App users collection--");
            console.log(JSON.stringify(data));
            callback();
        }).catch(function(err) {
            console.log("Error: " + err);
            callback();
        });
    });
}
function validate_flows(db, callback) {
    //Get flows that are errored with error messages
    //List flows that runs longer than settings.
    if (settings && settings.flows && settings.flows.run) {
        //get all apps
        var flows = {"total": 0};
        db.collection('apps').find({}).toArray(function(err, apps) {
            if (err) {
                console.log(err);
            }
            apps = apps || [];
            Promise.each(apps, function(app) {
                return new Promise(function(resolve) {
                    //get flow count
                    db.collection('flowSchema' + app._id).find({}).count(function(err, count) {
                        flows.total += count || 0;
                        db.collection('flowSchema' + app._id).find({"duration": {"$gt": settings.flows.duration * 1000}}).toArray(function(err, arr) {
                            if (arr && arr.length > 0) {
                                flows[app._id] = {};
                                flows[app._id].count = count || 0;
                                flows[app._id].long = arr.length;
                                flows[app._id].long_queries = arr;
                            }
                            //get errored flows/not updated for more than 48 hours
                            var now = Date.now().valueOf();
                            now = now - 24 * 60 * 60 * 1000;
                            db.collection('flowSchema' + app._id).find({"calculated": {"$lt": now}}).toArray(function(err, arr2) {
                                if (arr2 && arr2.length > 0) {
                                    flows[app._id] = flows[app._id] || {};
                                    flows[app._id].count = count || 0;
                                    flows[app._id].failing = arr2.length;
                                    flows[app._id].failing = arr2;
                                }
                                resolve();
                            });

                        });
                    });
                });
            }).then(function() {
                console.log("--FLOWS--");
                console.log(JSON.stringify(flows));
                callback();
            }).catch(function(err) {
                console.log("Error: " + err);
                callback();
            });
        });
    }
}

function validate_merges(db, callback) {
    if (settings && settings.merges && settings.merges.run) {
        console.log("--MERGES--");
        //get merges document count
        db.collection('app_user_merges').find({}).count(function(err, count) {
            console.log("total merges: " + count);
            if (count > 0) {
                //get oldes merge document
                db.collection('app_user_merges').find({}).sort({"ts": 1}).limit(1).toArray(function(err, oldest) {
                    console.log("oldest merge: " + JSON.stringify(oldest));

                    //lined up merges count by app_id
                    db.collection('app_user_merges').aggregate([{"$project": {"_id": {"$substrCP": ["$_id", 0, 24]}}}, {"$group": {"_id": "$_id", "cn": {"$sum": 1}}}, {"$match": {"cn": {"$gt": settings.merges.minimal_count_per_app || 0}}}], function(err, apps) {
                        console.log("Apps with count gt than " + settings.merges.minimal_count_per_app + ":");
                        console.log(JSON.stringify(apps));
                        callback();
                    });
                });
            }
            else {
                callback();
            }

        });
    }
}

Promise.all([pluginManager.dbConnection("countly")]).then(async function([countlyDb]) {
    fetchSystemInfo(countlyDb, function() {
        validate_merges(countlyDb, function() {
            validate_user_profiles(countlyDb, function() {
                validate_reports(countlyDb, function() {
                    validate_flows(countlyDb, function() {
                        validate_views(countlyDb, function() {
                            countlyDb.close();
                        });
                    });
                });
            });
        });
    });
});