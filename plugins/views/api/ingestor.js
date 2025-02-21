var pluginOb = {},
    crypto = require('crypto'),
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    log = common.log('views:ingestor');

const FEATURE_NAME = 'views';

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    plugins.internalDrillEvents.push("[CLY]_view");
    plugins.internalDrillEvents.push("[CLY]_action");
    /**
     *  Update view sg parameters - bounce,exit and duration (Moved from drill)
     *  @param {object} id - Object ID of drill document
	 *  @param {object} options - Options to update
	 *  @param {boolean} options.bounce - if bounce
	 *  @param {boolean} options.exit - if exit
     *  @param {params} params - params object
     *  @param {params} callback - when done
     **/
    /*const updateViewParams = async function(id, options, params) {
        var updateObj = {};
        var use_union_with = plugins.getConfig("drill", params.app_id && params.app && params.app.plugins, true).use_union_with;
        options = options || {};
        options.segments = options.segments || {};
        if (options.duration) {
            updateObj = {'$inc': {'dur': parseFloat(options.duration)}};
        }
        updateObj.$min = {'cd': new Date()};
        if (Object.keys(options.segments).length > 0) {
            updateObj.$set = options.segments;
        }

        if (Object.keys(updateObj).length > 0) {
            var hashedCollectionName = crypto.createHash('sha1').update("[CLY]_view" + params.app_id).digest('hex');
            if (options._idv) {
                //tries update based on _idv
                var res = await common.drillDb.collection("drill_events").updateOne({'_id': params.app_id + "_" + params.app_user.uid + '_' + options._idv}, updateObj);
                if (res && res.modifiedCount < 1) {
                    //did not update
                    //If not found - tries based on last view id.
                    if (use_union_with && id && id.split("_").length < 3 && id.indexOf(params.app_id) !== 0) {
                        //fallback id is in old collection.
                        //try update based on _idv old collection. If it fails 
                        var res3 = await common.drillDb.collection(hashedCollectionName).update({'_id': params.app_user.uid + '_' + options._idv}, updateObj);
                        if (res3 && res3.modifiedCount < 1) {
                            common.drillDb.collection(hashedCollectionName).update({'_id': id}, updateObj);
                        }
                    }
                    else {
                        await common.drillDb.collection("drill_events").updateOne({'_id': id}, updateObj, {upsert: false});
                    }
                }
            }
            else {
                if (id.split("_").length < 3 && id.indexOf(params.app_id) !== 0) {
                    //new id has a app_id in the beginning. If there is no app_id, then it is old id.
                    await common.drillDb.collection(hashedCollectionName).updateOne({'_id': params.app_id + "_" + params.app_user.uid + '_' + id}, updateObj, {upsert: false});
                }
                else {
                    await common.drillDb.collection("drill_events").updateOne({'_id': id}, updateObj, {'upsert': false});
                }
            }
        }
    };*/

    plugins.register("/sdk/process_user", async function(ob) {
        var params = ob.params;

        var update = {};

        if (params.qstring.begin_session && params.app_user.vc !== 0) {
            update = {"$set": {"vc": 0}};
        }
        if (params.qstring.events && params.qstring.events.length && Array.isArray(params.qstring.events)) {
            //do this before to make sure they are not processed before duration is added
            var current_views = {};
            var drill_updates = {};
            var have_drill = false;
            var fetch_appuserviews = false;
            var vc = 0;


            for (let p = 0; p < params.qstring.events.length; p++) {
                var currE = params.qstring.events[p];
                if (currE.key === "[CLY]_view") {
                    if (currE.segmentation && currE.segmentation.name) {
                        currE.name = currE.segmentation.name;
                        var view_id = crypto.createHash('md5').update(currE.segmentation.name).digest('hex');
                        currE.dur = Math.round(currE.dur || currE.segmentation.dur || 0);
                        delete currE.segmentation.dur;
                        //currE.vw = view_id;
                        if (currE.dur && (currE.dur + "").length >= 10) {
                            currE.dur = 0;
                        }

                        if (currE.segmentation.visit) {
                            current_views[currE.segmentation.name] = current_views[currE.segmentation.name] || {};
                            var doc = {"i": p};
                            if (currE.segmentation._idv) {

                                doc._idv = currE.segmentation._idv;
                                current_views[currE.segmentation.name][currE.segmentation._idv] = doc;
                                //if default not set or it is set as one with _idv, replace with newest
                                if (typeof current_views[currE.segmentation.name][0] === 'undefined' || current_views[currE.segmentation.name][0]._idv) {
                                    current_views[currE.segmentation.name][0] = doc;
                                }
                            }
                            else {
                                current_views[currE.segmentation.name][0] = doc;
                            }
                        }
                        else {
                            if (current_views[currE.segmentation.name]) {
                                //update document in this group
                                var index = current_views[currE.segmentation.name][0].i;
                                if (currE.segmentation._idv && current_views[currE.segmentation.name][currE.segmentation._idv]) {
                                    index = current_views[currE.segmentation.name][currE.segmentation._idv].i;
                                }
                                if (currE.dur) {
                                    params.qstring.events[index].dur += currE.dur; //add duration to this request
                                }
                                for (var seg in currE.segmentation) {
                                    if (seg !== 'dur' && seg !== "_idv") {
                                        params.qstring.events[index].segmentation = params.qstring.events[index].segmentation || {};
                                        params.qstring.events[index].segmentation[seg] = currE.segmentation[seg];
                                    }
                                }
                                params.qstring.events[p].dur = 0; //not use duration from this one anymore;

                            }
                            else {
                                have_drill = true;
                                drill_updates[view_id] = drill_updates[view_id] || {};
                                drill_updates[view_id].duration = (drill_updates[view_id].duration || 0) + currE.dur;
                                if (currE.segmentation) {
                                    drill_updates[view_id].segments = drill_updates[view_id].segments || {};
                                    if (currE.segmentation._idv) {
                                        drill_updates[view_id]._idv = currE.segmentation._idv;
                                    }
                                    else {
                                        fetch_appuserviews = true;
                                    }
                                    for (var k in currE.segmentation) {
                                        drill_updates[view_id].segments["sg." + k] = currE.segmentation[k];
                                    }
                                }
                                //store as update for drill.
                            }
                        }
                        //App Users update
                        if (currE.segmentation.visit) {
                            update.$set = update.$set || {};
                            update.$set.lv = currE.segmentation.name;
                            vc++;
                            update.$max = {lvt: params.time.timestamp};
                        }
                    }
                }
                else if (currE.key === "[CLY]_action") {
                    if (currE.segmentation && (currE.segmentation.name || currE.segmentation.view) && currE.segmentation.type && currE.segmentation.type === 'scroll') {
                        currE.scroll = 0;
                        currE.name = currE.segmentation.name || currE.segmentation.view;

                        if (currE.segmentation.y && currE.segmentation.height) {
                            try {
                                currE.segmentation.height = parseInt(currE.segmentation.height, 10);
                                currE.segmentation.y = parseInt(currE.segmentation.y, 10);
                                currE.segmentation.scr = Math.round((currE.segmentation.y * 100) / currE.segmentation.height);
                                if (currE.segmentation.scr > 100) {
                                    currE.segmentation.scr = 100;
                                }
                            }
                            catch (e) {
                                log.e(e);
                            }
                        }
                    }
                }
            }
            if (vc > 0) {
                if (update.$set && update.$set.vc > -1) {
                    update.$set.vc += vc;
                }
                else {
                    update.$inc = update.$inc || {};
                    update.$inc.vc = vc;
                }
            }
        }
        if (update.$set || update.$inc) {
            ob.updates.push(update);
        }

        var update_uvc = false;
        if (params.qstring.end_session && params.app_user.vc) {
            update_uvc = true;
            fetch_appuserviews = true;
        }
        //Update params for drill.
        if (have_drill || update_uvc) {
            try {
                var res = {};
                if (fetch_appuserviews) {
                    res = await common.db.collection("app_userviews" + params.app_id).findOne({'_id': params.app_user.uid});
                }
                if (update_uvc) {
                    var lvid = params.app_user.lvid;
                    var max = 0;
                    for (var rr in res) {
                        if (res[rr].ts > max) {
                            lvid = res[rr].lvid;
                            max = res[rr].ts;
                        }
                    }
                    if (lvid) {
                        var update4 = {"$set": {"sg.exit": 1}};
                        if (params.app_user.vc < 2) {
                            update4.$set["sg.bounce"] = 1;
                        }
                        ob.drill_updates.push({"updateOne": {"filter": {"_id": lvid}, "update": update4}});
                    }
                }
                /*If we want to add to updates with all drill updates ar once*/
                for (var iid in drill_updates) {
                    var upp = {};
                    if (Object.keys(drill_updates[iid].segments).length > 0) {
                        upp.$set = drill_updates[iid].segments;
                    }
                    if (drill_updates[iid].duration) {
                        upp.$inc = {"dur": drill_updates[iid].duration};
                    }
                    if (Object.keys(upp).length > 0) {
                        if (drill_updates[iid]._idv) {
                            ob.drill_updates.push({"updateOne": {"filter": {"_id": params.app_id + "_" + params.app_user.uid + '_' + drill_updates[iid]._idv}, "update": upp}});
                        }
                        else if (res && res[iid] && res[iid].lvid) {
                            ob.drill_updates.push({"updateOne": {"filter": {"_id": res[iid].lvid}, "update": upp}});
                        }
                        else if (params.app_user.lvid) {
                            ob.drill_updates.push({"updateOne": {"filter": {"_id": params.app_user.lvid}, "update": upp}});
                        }
                        else {
                            log.d("Missing view information: " + params.app_id + " " + params.app_user.uid + " " + ob.viewName);
                        }
                    }
                }


                /* If we want to do all fallback merging
                    for (var iid in drill_updates) {
                        if (res && res[iid] && res[iid].lvid) {
                            updateViewParams(res[iid].lvid, drill_updates[iid], params);
                        }
                        else if (params.app_user.lvid) {
                            updateViewParams(params.app_user.lvid, drill_updates[iid], params);
                        }
                        else if (drill_updates[iid]._idv) {
                            updateViewParams(params.app_id + "_" + params.app_user.uid + "_" + drill_updates[iid]._idv, drill_updates[iid], params);
                        }
                        else {
                            log.e("Missing view information: " + params.app_id + " " + params.app_user.uid + " " + ob.viewName);
                        }
                    }*/
            }
            catch (err) {
                log.e(err);
            }
        }

    });

}(pluginOb));

module.exports = pluginOb;