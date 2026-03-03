/**
 * Events management routes (/i/events).
 * Migrated from the legacy switch/case in requestProcessor.js.
 * @module api/routes/events
 */

const express = require('express');
const router = express.Router();
const common = require('../utils/common.js');
const { validateUser, validateRead, validateUserForWrite, validateGlobalAdmin, validateUpdate, validateDelete } = require('../utils/rights.js');
const plugins = require('../../plugins/pluginManager.ts');
const log = require('../utils/log.js')('core:api');

const validateUserForDataReadAPI = validateRead;
const validateUserForMgmtReadAPI = validateUser;
const validateUserForDataWriteAPI = validateUserForWrite;
const validateUserForGlobalAdmin = validateGlobalAdmin;

// --- /i/events endpoints ---

router.all('/i/events/whitelist_segments', (req, res) => {
    const params = req.countlyParams;
    validateUpdate(params, "events", function() {
        common.db.collection('events').findOne({"_id": common.db.ObjectID(params.qstring.app_id)}, function(err, event) {
            if (err) {
                common.returnMessage(params, 400, err);
                return;
            }
            else if (!event) {
                common.returnMessage(params, 400, "Could not find record in event collection");
                return;
            }

            //rewrite whitelisted
            if (params.qstring.whitelisted_segments && params.qstring.whitelisted_segments !== "") {
                try {
                    params.qstring.whitelisted_segments = JSON.parse(params.qstring.whitelisted_segments);
                }
                catch (SyntaxError) {
                    params.qstring.whitelisted_segments = {}; console.log('Parse ' + params.qstring.whitelisted_segments + ' JSON failed', params.req.url, params.req.body);
                }

                var update = {};
                var whObj = params.qstring.whitelisted_segments;
                for (let k in whObj) {
                    if (Array.isArray(whObj[k]) && whObj[k].length > 0) {
                        update.$set = update.$set || {};
                        update.$set["whitelisted_segments." + k] = whObj[k];
                    }
                    else {
                        update.$unset = update.$unset || {};
                        update.$unset["whitelisted_segments." + k] = true;
                    }
                }

                common.db.collection('events').update({"_id": common.db.ObjectID(params.qstring.app_id)}, update, function(err2) {
                    if (err2) {
                        common.returnMessage(params, 400, err2);
                    }
                    else {
                        var data_arr = {update: {}};
                        if (update.$set) {
                            data_arr.update.$set = update.$set;
                        }

                        if (update.$unset) {
                            data_arr.update.$unset = update.$unset;
                        }
                        data_arr.update = JSON.stringify(data_arr.update);
                        common.returnMessage(params, 200, 'Success');
                        plugins.dispatch("/systemlogs", {
                            params: params,
                            action: "segments_whitelisted_for_events",
                            data: data_arr
                        });
                    }
                });

            }
            else {
                common.returnMessage(params, 400, "Value for 'whitelisted_segments' missing");
                return;
            }


        });
    });
});

router.all('/i/events/edit_map', (req, res) => {
    const params = req.countlyParams;
    if (!params.qstring.app_id) {
        common.returnMessage(params, 400, 'Missing parameter "app_id"');
        return false;
    }
    validateUpdate(params, 'events', function() {
        common.db.collection('events').findOne({"_id": common.db.ObjectID(params.qstring.app_id)}, async function(err, event) {
            if (err) {
                common.returnMessage(params, 400, err);
                return;
            }
            else if (!event) {
                common.returnMessage(params, 400, "Could not find event");
                return;
            }
            //Load available events

            const pluginsGetConfig = plugins.getConfig("api", params.app && params.app.plugins, true);

            var list = await common.drillDb.collection("drill_meta").aggregate(
                [
                    {$match: {"app_id": params.qstring.app_id, "type": "e", "biglist": {"$ne": true}}},
                    {$match: {"e": {"$not": /^(\[CLY\]_)/}}},
                    {"$group": {"_id": "$e"}},
                    {"$sort": {"_id": 1}},
                    {"$limit": pluginsGetConfig.event_limit || 500},
                    {"$group": {"_id": null, "list": {"$addToSet": "$_id"}}}
                ]
                , {"allowDiskUse": true}).toArray();
            event.list = list[0].list;

            var update_array = {};
            var update_segments = [];
            var pull_us = {};
            if (params.qstring.event_order && params.qstring.event_order !== "") {
                try {
                    update_array.order = JSON.parse(params.qstring.event_order);
                }
                catch (SyntaxError) {
                    update_array.order = event.order; console.log('Parse ' + params.qstring.event_order + ' JSON failed', params.req.url, params.req.body);
                }
            }
            else {
                update_array.order = event.order || [];
            }

            if (params.qstring.event_overview && params.qstring.event_overview !== "") {
                try {
                    update_array.overview = JSON.parse(params.qstring.event_overview);
                }
                catch (SyntaxError) {
                    update_array.overview = []; console.log('Parse ' + params.qstring.event_overview + ' JSON failed', params.req.url, params.req.body);
                }
                if (update_array.overview && Array.isArray(update_array.overview)) {
                    if (update_array.overview.length > 12) {
                        common.returnMessage(params, 400, "You can't add more than 12 items in overview");
                        return;
                    }
                    //sanitize overview
                    var allowedEventKeys = event.list;
                    var allowedProperties = ['dur', 'sum', 'count'];
                    var propertyNames = {
                        'dur': 'Dur',
                        'sum': 'Sum',
                        'count': 'Count'
                    };
                    for (let i = 0; i < update_array.overview.length; i++) {
                        update_array.overview[i].order = i;
                        update_array.overview[i].eventKey = update_array.overview[i].eventKey || "";
                        update_array.overview[i].eventProperty = update_array.overview[i].eventProperty || "";
                        if (allowedEventKeys.indexOf(update_array.overview[i].eventKey) === -1 || allowedProperties.indexOf(update_array.overview[i].eventProperty) === -1) {
                            update_array.overview.splice(i, 1);
                            i = i - 1;
                        }
                        else {
                            update_array.overview[i].is_event_group = (typeof update_array.overview[i].is_event_group === 'boolean' && update_array.overview[i].is_event_group) || false;
                            update_array.overview[i].eventName = update_array.overview[i].eventName || update_array.overview[i].eventKey;
                            update_array.overview[i].propertyName = propertyNames[update_array.overview[i].eventProperty];
                        }
                    }
                    //check for duplicates
                    var overview_map = Object.create(null);
                    for (let p = 0; p < update_array.overview.length; p++) {
                        if (!overview_map[update_array.overview[p].eventKey]) {
                            overview_map[update_array.overview[p].eventKey] = {};
                        }
                        if (!overview_map[update_array.overview[p].eventKey][update_array.overview[p].eventProperty]) {
                            overview_map[update_array.overview[p].eventKey][update_array.overview[p].eventProperty] = 1;
                        }
                        else {
                            update_array.overview.splice(p, 1);
                            p = p - 1;
                        }
                    }
                }
            }
            else {
                update_array.overview = event.overview || [];
            }

            update_array.omitted_segments = {};

            if (event.omitted_segments) {
                try {
                    update_array.omitted_segments = JSON.parse(JSON.stringify(event.omitted_segments));
                }
                catch (SyntaxError) {
                    update_array.omitted_segments = {};
                }
            }

            if (params.qstring.omitted_segments && params.qstring.omitted_segments !== "") {
                var omitted_segments_empty = false;
                try {
                    params.qstring.omitted_segments = JSON.parse(params.qstring.omitted_segments);
                    if (JSON.stringify(params.qstring.omitted_segments) === '{}') {
                        omitted_segments_empty = true;
                    }
                }
                catch (SyntaxError) {
                    params.qstring.omitted_segments = {}; console.log('Parse ' + params.qstring.omitted_segments + ' JSON failed', params.req.url, params.req.body);
                }

                for (let k in params.qstring.omitted_segments) {
                    update_array.omitted_segments[k] = params.qstring.omitted_segments[k];
                    update_segments.push({
                        "key": k,
                        "list": params.qstring.omitted_segments[k]
                    });
                    pull_us["segments." + k] = {$in: params.qstring.omitted_segments[k]};
                }
                if (omitted_segments_empty) {
                    var events = JSON.parse(params.qstring.event_map);
                    for (let k in events) {
                        if (update_array.omitted_segments[k]) {
                            delete update_array.omitted_segments[k];
                        }
                    }
                }
            }

            if (params.qstring.event_map && params.qstring.event_map !== "") {
                try {
                    params.qstring.event_map = JSON.parse(params.qstring.event_map);
                }
                catch (SyntaxError) {
                    params.qstring.event_map = {}; console.log('Parse ' + params.qstring.event_map + ' JSON failed', params.req.url, params.req.body);
                }

                if (event.map) {
                    try {
                        update_array.map = JSON.parse(JSON.stringify(event.map));
                    }
                    catch (SyntaxError) {
                        update_array.map = {};
                    }
                }
                else {
                    update_array.map = {};
                }


                for (let k in params.qstring.event_map) {
                    if (Object.prototype.hasOwnProperty.call(params.qstring.event_map, k)) {
                        update_array.map[k] = params.qstring.event_map[k];

                        if (update_array.map[k].is_visible && update_array.map[k].is_visible === true) {
                            delete update_array.map[k].is_visible;
                        }
                        if (update_array.map[k].name && update_array.map[k].name === k) {
                            delete update_array.map[k].name;
                        }

                        if (update_array.map[k] && typeof update_array.map[k].is_visible !== 'undefined' && update_array.map[k].is_visible === false) {
                            for (var j = 0; j < update_array.overview.length; j++) {
                                if (update_array.overview[j].eventKey === k) {
                                    update_array.overview.splice(j, 1);
                                    j = j - 1;
                                }
                            }
                        }
                        if (Object.keys(update_array.map[k]).length === 0) {
                            delete update_array.map[k];
                        }
                    }
                }
            }
            var changes = {$set: update_array};
            if (Object.keys(pull_us).length > 0) {
                changes = {
                    $set: update_array,
                    $pull: pull_us
                };
            }

            common.db.collection('events').update({"_id": common.db.ObjectID(params.qstring.app_id)}, changes, function(err2) {
                if (err2) {
                    common.returnMessage(params, 400, err2);
                }
                else {
                    var data_arr = {update: update_array};
                    data_arr.before = {
                        order: [],
                        map: {},
                        overview: [],
                        omitted_segments: {}
                    };
                    if (event.order) {
                        data_arr.before.order = event.order;
                    }
                    if (event.map) {
                        data_arr.before.map = event.map;
                    }
                    if (event.overview) {
                        data_arr.before.overview = event.overview;
                    }
                    if (event.omitted_segments) {
                        data_arr.before.omitted_segments = event.omitted_segments;
                    }

                    //updated, clear out segments
                    Promise.all(update_segments.map(function(obj) {
                        return new Promise(function(resolve) {
                            var collectionNameWoPrefix = common.crypto.createHash('sha1').update(obj.key + params.qstring.app_id).digest('hex');
                            //removes all document for current segment
                            common.db.collection("events_data").remove({"_id": {"$regex": ("^" + params.qstring.app_id + "_" + collectionNameWoPrefix + "_.*")}, "s": {$in: obj.list}}, {multi: true}, function(err3) {
                                if (err3) {
                                    console.log(err3);
                                }
                                //create query for all segments
                                var my_query = [];
                                var unsetUs = {};
                                if (obj.list.length > 0) {
                                    for (let p = 0; p < obj.list.length; p++) {
                                        my_query[p] = {};
                                        my_query[p]["meta_v2.segments." + obj.list[p]] = {$exists: true}; //for select
                                        unsetUs["meta_v2.segments." + obj.list[p]] = ""; //remove from list
                                        unsetUs["meta_v2." + obj.list[p]] = "";
                                    }
                                    //clears out meta data for segments
                                    common.db.collection("events_data").update({"_id": {"$regex": ("^" + params.qstring.app_id + "_" + collectionNameWoPrefix + "_.*")}, $or: my_query}, {$unset: unsetUs}, {multi: true}, function(err4) {
                                        if (err4) {
                                            console.log(err4);
                                        }
                                        if (plugins.isPluginEnabled('drill')) {
                                            //remove from drill
                                            var eventHash = common.crypto.createHash('sha1').update(obj.key + params.qstring.app_id).digest('hex');
                                            common.drillDb.collection("drill_meta").findOne({_id: params.qstring.app_id + "_meta_" + eventHash}, function(err5, resEvent) {
                                                if (err5) {
                                                    console.log(err5);
                                                }

                                                var newsg = {};
                                                var remove_biglists = [];
                                                resEvent = resEvent || {};
                                                resEvent.sg = resEvent.sg || {};
                                                for (let p = 0; p < obj.list.length; p++) {
                                                    remove_biglists.push(params.qstring.app_id + "_meta_" + eventHash + "_sg." + obj.list[p]);
                                                    newsg["sg." + obj.list[p]] = {"type": "s"};
                                                }
                                                //big list, delete also big list file
                                                if (remove_biglists.length > 0) {
                                                    common.drillDb.collection("drill_meta").remove({_id: {$in: remove_biglists}}, function(err6) {
                                                        if (err6) {
                                                            console.log(err6);
                                                        }
                                                        common.drillDb.collection("drill_meta").update({_id: params.qstring.app_id + "_meta_" + eventHash}, {$set: newsg}, function(err7) {
                                                            if (err7) {
                                                                console.log(err7);
                                                            }
                                                            resolve();
                                                        });
                                                    });
                                                }
                                                else {
                                                    common.drillDb.collection("drill_meta").update({_id: params.qstring.app_id + "_meta_" + eventHash}, {$set: newsg}, function() {
                                                        resolve();
                                                    });
                                                }
                                            });
                                        }
                                        else {
                                            resolve();
                                        }
                                    });
                                }
                                else {
                                    resolve();
                                }
                            });
                        });

                    })).then(function() {
                        common.returnMessage(params, 200, 'Success');
                        plugins.dispatch("/systemlogs", {
                            params: params,
                            action: "events_updated",
                            data: data_arr
                        });

                    })
                        .catch((error) => {
                            console.log(error);
                            common.returnMessage(params, 400, 'Events were updated sucessfully. There was error during clearing segment data. Please look in log for more onformation');
                        });

                }
            });
        });
    });
});

/**
 * @api {get} /i/events/delete_events Delete event
 * @apiName Delete Event
 * @apiGroup Events Management
 *
 * @apiDescription Deletes one or multiple events.
 * @apiQuery {String} app_id Application id
 * @apiQuery {String} events JSON array of event keys to delete.
 *
 * @apiSuccessExample {json} Success-Response:
 * HTTP/1.1 200 OK
 * {
 *  "result":"Success"
 * }
 */
router.all('/i/events/delete_events', (req, res) => {
    const params = req.countlyParams;
    validateDelete(params, 'events', function() {
        var idss = [];
        try {
            idss = JSON.parse(params.qstring.events);
        }
        catch (SyntaxError) {
            idss = [];
        }

        if (!Array.isArray(idss)) {
            idss = [];
        }

        var app_id = params.qstring.app_id;
        var updateThese = {"$unset": {}};
        if (idss.length > 0) {

            common.db.collection('events').findOne({"_id": common.db.ObjectID(params.qstring.app_id)}, function(err, event) {
                if (err) {
                    common.returnMessage(params, 400, err);
                }
                if (!event) {
                    common.returnMessage(params, 400, "Could not find event");
                    return;
                }
                let successIds = [];
                let failedIds = [];
                let promises = [];
                for (let i = 0; i < idss.length; i++) {
                    let collectionNameWoPrefix = common.crypto.createHash('sha1').update(idss[i] + app_id).digest('hex');
                    common.db.collection("events" + collectionNameWoPrefix).drop();
                    promises.push(new Promise((resolve, reject) => {
                        plugins.dispatch("/i/event/delete", {
                            event_key: idss[i],
                            appId: app_id
                        }, function(_, otherPluginResults) {
                            const rejectReasons = otherPluginResults?.reduce((acc, result) => {
                                if (result?.status === "rejected") {
                                    acc.push((result.reason && result.reason.message) || '');
                                }
                                return acc;
                            }, []);

                            if (rejectReasons?.length) {
                                failedIds.push(idss[i]);
                                log.e("Event deletion failed\n%j", rejectReasons.join("\n"));
                                reject("Event deletion failed. Failed to delete some data related to this Event.");
                                return;
                            }
                            else {
                                successIds.push(idss[i]);
                                resolve();
                            }
                        }
                        );
                    }));
                }

                Promise.allSettled(promises).then(async() => {
                    //remove from map, segments, omitted_segments
                    for (let i = 0; i < successIds.length; i++) {
                        successIds[i] = successIds[i] + ""; //make sure it is string to do not fail.
                        if (successIds[i].indexOf('.') !== -1) {
                            updateThese.$unset["map." + successIds[i].replace(/\./g, '\\u002e')] = 1;
                            updateThese.$unset["omitted_segments." + successIds[i].replace(/\./g, '\\u002e')] = 1;
                        }
                        else {
                            updateThese.$unset["map." + successIds[i]] = 1;
                            updateThese.$unset["omitted_segments." + successIds[i]] = 1;
                        }
                        successIds[i] = common.decode_html(successIds[i]);//previously escaped, get unescaped id (because segments are using it)
                        if (successIds[i].indexOf('.') !== -1) {
                            updateThese.$unset["segments." + successIds[i].replace(/\./g, '\\u002e')] = 1;
                        }
                        else {
                            updateThese.$unset["segments." + successIds[i]] = 1;
                        }
                    }
                    //fix overview
                    if (event.overview && event.overview.length) {
                        for (let i = 0; i < successIds.length; i++) {
                            for (let j = 0; j < event.overview.length; j++) {
                                if (event.overview[j].eventKey === successIds[i]) {
                                    event.overview.splice(j, 1);
                                    j = j - 1;
                                }
                            }
                        }
                        if (!updateThese.$set) {
                            updateThese.$set = {};
                        }
                        updateThese.$set.overview = event.overview;
                    }
                    //remove from list
                    if (typeof event.list !== 'undefined' && Array.isArray(event.list) && event.list.length > 0) {
                        for (let i = 0; i < successIds.length; i++) {
                            let index = event.list.indexOf(successIds[i]);
                            if (index > -1) {
                                event.list.splice(index, 1);
                                i = i - 1;
                            }
                        }
                        if (!updateThese.$set) {
                            updateThese.$set = {};
                        }
                        updateThese.$set.list = event.list;
                    }
                    //remove from order
                    if (typeof event.order !== 'undefined' && Array.isArray(event.order) && event.order.length > 0) {
                        for (let i = 0; i < successIds.length; i++) {
                            let index = event.order.indexOf(successIds[i]);
                            if (index > -1) {
                                event.order.splice(index, 1);
                                i = i - 1;
                            }
                        }
                        if (!updateThese.$set) {
                            updateThese.$set = {};
                        }
                        updateThese.$set.order = event.order;
                    }

                    await common.db.collection('events').update({ "_id": common.db.ObjectID(app_id) }, updateThese);

                    plugins.dispatch("/systemlogs", {
                        params: params,
                        action: "event_deleted",
                        data: {
                            events: successIds,
                            appID: app_id
                        }
                    });

                    common.returnMessage(params, 200, 'Success');

                }).catch((err2) => {
                    if (failedIds.length) {
                        log.e("Event deletion failed for following Event keys:\n%j", failedIds.join("\n"));
                    }
                    log.e("Event deletion failed\n%j", err2);
                    common.returnMessage(params, 500, { errorMessage: "Event deletion failed. Failed to delete some data related to this Event." });
                });
            });
        }
        else {
            common.returnMessage(params, 400, "Missing events to delete");
        }
    });
});

router.all('/i/events/change_visibility', (req, res) => {
    const params = req.countlyParams;
    validateUpdate(params, 'events', function() {
        common.db.collection('events').findOne({"_id": common.db.ObjectID(params.qstring.app_id)}, function(err, event) {
            if (err) {
                common.returnMessage(params, 400, err);
                return;
            }
            if (!event) {
                common.returnMessage(params, 400, "Could not find event");
                return;
            }

            var update_array = {};
            var idss = [];
            try {
                idss = JSON.parse(params.qstring.events);
            }
            catch (SyntaxError) {
                idss = [];
            }
            if (!Array.isArray(idss)) {
                idss = [];
            }

            if (event.map) {
                try {
                    update_array.map = JSON.parse(JSON.stringify(event.map));
                }
                catch (SyntaxError) {
                    update_array.map = {};
                    console.log('Parse ' + event.map + ' JSON failed', params.req.url, params.req.body);
                }
            }
            else {
                update_array.map = {};
            }

            for (let i = 0; i < idss.length; i++) {

                var baseID = idss[i].replace(/\\u002e/g, ".");
                if (!update_array.map[idss[i]]) {
                    update_array.map[idss[i]] = {};
                }

                if (params.qstring.set_visibility === 'hide') {
                    update_array.map[idss[i]].is_visible = false;
                }
                else {
                    update_array.map[idss[i]].is_visible = true;
                }

                if (update_array.map[idss[i]].is_visible) {
                    delete update_array.map[idss[i]].is_visible;
                }

                if (Object.keys(update_array.map[idss[i]]).length === 0) {
                    delete update_array.map[idss[i]];
                }

                if (params.qstring.set_visibility === 'hide' && event && event.overview && Array.isArray(event.overview)) {
                    for (let j = 0; j < event.overview.length; j++) {
                        if (event.overview[j].eventKey === baseID) {
                            event.overview.splice(j, 1);
                            j = j - 1;
                        }
                    }
                    update_array.overview = event.overview;
                }
            }
            common.db.collection('events').update({"_id": common.db.ObjectID(params.qstring.app_id)}, {'$set': update_array}, function(err2) {

                if (err2) {
                    common.returnMessage(params, 400, err2);
                }
                else {
                    common.returnMessage(params, 200, 'Success');
                    var data_arr = {update: update_array};
                    data_arr.before = {map: {}};
                    if (event.map) {
                        data_arr.before.map = event.map;
                    }
                    plugins.dispatch("/systemlogs", {
                        params: params,
                        action: "events_updated",
                        data: data_arr
                    });
                }
            });
        });
    });
});

// Catch-all for /i/events/* - dispatches to plugins or returns error
router.all('/i/events/:action', (req, res) => {
    const params = req.countlyParams;
    const paths = params.paths;
    const apiPath = '/i/events';
    if (!plugins.dispatch(apiPath, {
        params: params,
        validateUserForDataReadAPI: validateUserForDataReadAPI,
        validateUserForMgmtReadAPI: validateUserForMgmtReadAPI,
        paths: paths,
        validateUserForDataWriteAPI: validateUserForDataWriteAPI,
        validateUserForGlobalAdmin: validateUserForGlobalAdmin
    })) {
        common.returnMessage(params, 400, 'Invalid path, must be one of /all or /me');
    }
});

module.exports = router;
