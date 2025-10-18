var pluginOb = {},
    common = require('../../../api/utils/common.js'),
    plugins = require('../../pluginManager.js'),
    log = common.log('views:ingestor');

(function() {
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
            /*var drill_updates = {};
            var have_drill = false;
            var fetch_appuserviews = false;*/
            var vc = 0;

            var last_started_view = null;

            for (let p = 0; p < params.qstring.events.length; p++) {
                var currE = params.qstring.events[p];
                if (currE.key === "[CLY]_view") {
                    if (currE._system_auto_added) {
                        continue;
                    }
                    if (currE.segmentation && currE.segmentation.name) {
                        currE.name = currE.segmentation.name;
                        //var view_id = crypto.createHash('md5').update(currE.segmentation.name).digest('hex');
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
                                //have_drill = true;
                                var updateForLastView = false;
                                if (params.app_user.last_view) {
                                    if (currE.segmentation && currE.segmentation.name === params.app_user.last_view.name) {
                                        if (currE.segmentation._idv) {
                                            if (currE.segmentation._idv === params.app_user.last_view._idv) {
                                                updateForLastView = true;
                                            }
                                        }
                                        else {
                                            if (!params.app_user.last_view._idv) {
                                                updateForLastView = true;
                                            }
                                        }
                                    }
                                }
                                if (updateForLastView) {
                                    currE.key = null;
                                    params.app_user.last_view.duration = currE.dur;
                                    if (currE.segmentation) {
                                        params.app_user.last_view.segments = params.app_user.last_view.segments || {};
                                        for (var k in currE.segmentation) {
                                            params.app_user.last_view.segments[k] = currE.segmentation[k];
                                        }
                                    }
                                    params.app_user.last_view.isEnded = true;
                                    if (currE.timestamp) {
                                        params.app_user.last_view.timestamp = currE.timestamp;
                                    }

                                    update.$set = update.$set || {};
                                    update.$set.last_view = params.app_user.last_view;
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
                            last_started_view = currE;
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
                    //We have new view started.
                }
                else {
                    update.$inc = update.$inc || {};
                    update.$inc.vc = vc;
                }
            }

            if (last_started_view) {
                // If we have a last started view, we store it
                update.$set.last_view = {
                    "_idv": last_started_view.segmentation && last_started_view.segmentation._idv,
                    "name": last_started_view.name,
                    "timestamp": last_started_view.timestamp,
                    "duration": 0,
                    "segments": {},
                    "isEnded": last_started_view.isEnded || false
                };
                for (var segk in last_started_view.segmentation) {
                    if (segk !== "visit") {
                        update.$set.last_view.segments[segk] = last_started_view.segmentation[segk];
                    }
                }

                // delete update.$set.last_view.segments.visit;
                if (params.app_user.last_view && params.app_user.last_view.isEnded) {
                    //Flush view update event for previously kept view
                    params.qstring.events.push({
                        "key": "[CLY]_view",
                        "name": params.app_user.last_view.name,
                        "timestamp": params.app_user.last_view.timestamp,
                        "segmentation": params.app_user.last_view.segments || {},
                        "dur": params.app_user.last_view.duration || 0,
                        "_id": (params.app_user.last_view._idv ? (params.app_id + "_" + params.app_user.uid + '_' + params.app_user.last_view._idv + '_up') : (params.app_user.lvid + '_up'))
                    });
                }
            }
        }
        if (update.$set || update.$inc) {
            ob.updates.push(update);
        }

        /*var update_uvc = false;
        if (params.qstring.end_session && params.app_user.vc) {
            update_uvc = true;
            fetch_appuserviews = true;
        }
        //Update params for drill.
        if (have_drill || update_uvc) {
            try {
                var res = {};
                if (fetch_appuserviews) {
                    res = await common.db.collection("app_userviews").findOne({'_id': params.app_id + "_" + params.app_user.uid});
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
                        drill_updates[lvid] = drill_updates[lvid] || {};
                        drill_updates[lvid].segmentation = drill_updates[lvid].segmentation || {};
                        drill_updates[lvid].segmentation.exit = 1;
                        if (params.app_user.vc < 2) {
                            drill_updates[lvid].segmentation.bounce = 1;
                        }
                    }
                }

                for (var iid in drill_updates) {
                    var doc2 = {
                        "e": "[CLY]_view_update",
                        "n": drill_updates[iid].name,
                        "segmentation": drill_updates[iid].segmentation,
                        "dur": drill_updates[iid].duration || 0

                    };
                    if (drill_updates[iid]._idv) {
                        doc2._id = params.app_id + "_" + params.app_user.uid + '_' + drill_updates[iid]._idv + '_up';
                    }
                    else if (res && res[iid] && res[iid].lvid) {
                        doc2._id = res[iid].lvid + '_up';
                    }
                    else if (params.app_user.lvid) {
                        doc2._id = params.app_user.lvid + '_up';
                    }
                    params.qstring.events.push(doc2);
                }
            }
            catch (err) {
                log.e(err);
            }
        }*/

    });

}(pluginOb));

module.exports = pluginOb;