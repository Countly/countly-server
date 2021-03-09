/**
Path to file: {COUNTLY DIR}/plugins/views/scripts/renameViews.js
Script renames views for app. 
Please fill correct app id.
After this script there is need to run fixViews.js to merge views.(In case renaming creates two views with same name)
**/
var pluginManager = require('../../pluginManager.js'),
    crypto = require('crypto'),
    Promise = require("bluebird"),
    countlyDb,
    countly_drill,
    drillCommon = require('../../drill/api/common.js');


var appId = ""; //Your app id
var fromValue = /&#46;/g; //take this value
var toValue = '.'; //and replace to this value

console.log("Getting all views we need to update");
function merge_drill_data(viewdata, callback) {
    var setO = {};
    var events = [];
    var updateEvents = [];

    if (!viewdata.view) {
        callback();
        return;
    }
    if (viewdata.view.indexOf(fromValue) > -1) {
        setO['sg.name'] = viewdata.view.replace(fromValue, toValue);
        updateEvents.push({"collection": drillCommon.getCollectionName('[CLY]_view', appId), "updateO": {"sg.name": viewdata.view}, "setO": {"sg.name": setO['sg.name']}});
        updateEvents.push({"collection": drillCommon.getCollectionName('[CLY]_view', appId), "updateO": {"up.lv": viewdata.view}, "setO": {"up.lv": setO['sg.name']}});
    }

    if (viewdata.url && viewdata.url.indexOf(fromValue) > -1) {
        setO['sg.view'] = viewdata.url.replace(fromValue, toValue);
        updateEvents.push({"collection": drillCommon.getCollectionName('[CLY]_action', appId), "updateO": {"sg.view": viewdata.url}, "setO": {"sg.view": setO['sg.view']}});
        updateEvents.push({"collection": drillCommon.getCollectionName('[CLY]_action', appId), "updateO": {"up.lv": viewdata.url}, "setO": {"up.lv": setO['sg.name']}});

    }

    events.push({key: "[CLY]_view", segment: "sg.name", oldvalue: viewdata.view, newvalue: setO['sg.name'] });
    events.push({key: "[CLY]_action", segment: "sg.view", oldvalue: viewdata.url, newvalue: setO['sg.view'] });
    events.push({key: "meta_up", segment: "up.lv", oldvalue: viewdata.view, newvalue: setO['sg.name'] });

    Promise.each(updateEvents, function(eventdata) {
        return new Promise(function(resolveSub/*, rejectSub*/) {
            console.log("Updating events in " + eventdata.collection + " : " + JSON.stringify(eventdata.setO));
            countly_drill.collection(eventdata.collection).update(eventdata.updateO, {"$set": eventdata.setO}, {multi: true}, function(errEvents) {
                if (errEvents) {
                    console.log(errEvents);
                }
                resolveSub();
            });
        });
    }).then(function() {
        Promise.each(events, function(eventdata) {
            return new Promise(function(resolveSub/*, rejectSub*/) {
                console.log("Updating meta information for event: " + eventdata.key);
                var eventHash = crypto.createHash('sha1').update(eventdata.key + appId).digest('hex');
                var collectionMeta = "drill_meta" + appId;
                if (eventdata.key === "meta_up") {
                    eventHash = "up";
                }
                countly_drill.collection(collectionMeta).findOne({"_id": "meta_" + eventHash}, function(err3, meta_event) {
                    if (err3) {
                        console.log(err3);
                    }
                    var type = "";
                    if (eventdata.key === "meta_up") {
                        if (meta_event && meta_event.up && meta_event.up.lv) {
                            type = meta_event.up.lv.type;
                        }
                    }
                    else {
                        if (meta_event && meta_event.sg && meta_event.sg[eventdata.segment]) {
                            type = meta_event.sg[eventdata.segment].type;
                        }
                    }
                    var keyold;
                    var keynew;
                    var updateObj = {$set: {}, $unset: {}};
                    if (type === 'l') {
                        keyold = [eventdata.segment] + ".values." + countlyDb.encode(eventdata.oldvalue);
                        keynew = [eventdata.segment] + ".values." + countlyDb.encode(eventdata.newvalue);
                        updateObj["$set"][keynew] = true;
                        updateObj["$unset"][keyold] = true;
                        countly_drill.collection(collectionMeta).update({"_id": "meta_" + eventHash}, updateObj, function(err4) {
                            if (err4) {
                                console.log(err4);
                            }
                            resolveSub();
                        });
                    }
                    else if (type === 'bl' && eventdata.key === "meta_up") { //because for sg we go to string when limit reached
                        keyold = "values." + countlyDb.encode(eventdata.oldvalue);
                        keynew = "values." + countlyDb.encode(eventdata.newvalue);
                        updateObj["$set"][keynew] = true;
                        updateObj["$unset"][keyold] = true;
                        countly_drill.collection(collectionMeta).update({"_id": "meta_" + eventHash + "_up.lv"}, updateObj, function(err5) {
                            if (err5) {
                                console.log(err5);
                            }
                            resolveSub();
                        });
                    }
                    else {
                        resolveSub();
                    }


                });
            });
        }).then(function() {
            callback();

        });
    });
}

function check_renames(done) {
    console.log("Check if there are not unfinished renaming processes");
    countlyDb.collection('app_viewsmeta_renames').find({}).toArray(function(err, merges) {
        if (err) {
            console.log(err);
        }
        if (merges.length === 0) {
            done();
        }
        else {
            Promise.each(merges, function(merge) {
                return new Promise(function(resolve/*, reject*/) {
                    merge_drill_data(merge, function() {
                        countlyDb.collection('app_viewsmeta_renames').remove({_id: merge._id}, function() {
                            resolve();
                        });
                    });
                });
            }).then(function() {
                done();
            });
        }
    });
}

Promise.all([pluginManager.dbConnection("countly"), pluginManager.dbConnection("countly_drill")]).spread(function(db, db_drill) {
    countlyDb = db;
    countly_drill = db_drill;
    check_renames(function() {
        countlyDb.collection('views').find({_id: countlyDb.ObjectID(appId)}).toArray(function(err, viewBase) {
            countlyDb.collection("app_viewsmeta" + appId).find({$or: [{'view': {$regex: fromValue}}, {'url': {$regex: fromValue}}]}).toArray(function(err, res) {
                if (err) {
                    console.log(err);
                    countlyDb.close();
                }
                else {
                    if (res && res.length > 0) {
                        console.log("Updating" + res.length + " views");
                        Promise.each(res, function(viewdata) {
                            return new Promise(function(resolve/*, reject*/) {
                                console.log("Updating view: " + viewdata.view);
                                var ob = {_id: viewdata.view, "view": viewdata.view, "to": viewdata.view.replace(fromValue, toValue)};
                                var setOb = {"view": ob.to};
                                if (viewdata.url) {
                                    if (viewdata.url.indexOf(fromValue) > -1) {
                                        setOb["url"] = viewdata.url.replace(fromValue, toValue);
                                        ob["url"] = setOb["url"];
                                    }
                                }
                                else {
                                    viewdata.url = viewdata.view;
                                    ob["url"] = viewdata.url;
                                }

                                countlyDb.collection('app_viewsmeta_renames').insert(ob, function(err) {
                                    if (err) {
                                        if (err.code !== 11000) {
                                            console.log(err);
                                        }
                                    }
                                    console.log("Try renaming in app_viewsmeta");
                                    console.log(viewdata._id);
                                    console.log(JSON.stringify(setOb));
                                    countlyDb.collection("app_viewsmeta" + appId).update({_id: countlyDb.ObjectID(viewdata._id)}, {$set: setOb}, function(err) {
                                        if (err) {
                                            console.log("Couldn't rename");
                                            //we have error  - need to merge views.
                                            //get current view with that name
                                            countlyDb.collection("app_viewsmeta" + appId).findOne({"view": ob.to}, function(err, newview) {
                                                console.log(newview);
                                                console.log("Add to merge list: " + ob.to);
                                                var iOb = {_id: newview._id + "_" + appId, "view": ob.to, "base": countlyDb.ObjectID(newview._id), mergeIn: [viewdata._id], "appID": appId, "segments": viewBase.segments};

                                                countlyDb.collection('app_viewsmeta_merges').insert(iOb, function(err) {
                                                    if (err) {
                                                        if (err.code !== 11000) {
                                                            console.log(err);
                                                        }
                                                    }
                                                    merge_drill_data(viewdata, function() {
                                                        countlyDb.collection('app_viewsmeta_renames').remove({_id: ob._id}, function() {
                                                            resolve();
                                                        });
                                                    });
                                                });
                                            });

                                        }
                                        else {
                                            merge_drill_data(viewdata, function() {
                                                countlyDb.collection('app_viewsmeta_renames').remove({_id: ob._id}, function() {
                                                    resolve();
                                                });
                                            });
                                        }
                                    });
                                });
                            });
                        }).then(function() {
                            console.log("finished");
                            countlyDb.close();

                            if (countly_drill) {
                                countly_drill.close();
                            }
                        });
                    }
                    else {
                        console.log("Couldn't find any view to rename");
                        countlyDb.close();

                        if (countly_drill) {
                            countly_drill.close();
                        }
                    }
                }
            });
        });
    });
});

