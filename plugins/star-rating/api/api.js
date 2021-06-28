var exported = {},
    requestProcessor = require('../../../api/utils/requestProcessor'),
    common = require('../../../api/utils/common.js'),
    crypto = require('crypto'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    plugins = require('../../pluginManager.js'),
    { validateCreate, validateRead, validateUpdate, validateDelete } = require('../../../api/utils/rights.js');
var fetch = require('../../../api/parts/data/fetch.js');
var ejs = require("ejs"),
    path = require('path'),
    reportUtils = require('../../reports/api/utils.js');

const FEATURE_NAME = 'starrating';

const widgetProperties = {
    popup_header_text: {
        required: false,
        type: "String"
    },
    popup_comment_callout: {
        required: false,
        type: "String"
    },
    popup_email_callout: {
        required: false,
        type: "String"
    },
    popup_button_callout: {
        required: false,
        type: "String"
    },
    popup_thanks_message: {
        required: false,
        type: "String"
    },
    trigger_position: {
        required: false,
        type: "String"
    },
    trigger_bg_color: {
        required: false,
        type: "String"
    },
    trigger_font_color: {
        required: false,
        type: "String"
    },
    trigger_button_text: {
        required: false,
        type: "String"
    },
    target_devices: {
        required: false,
        type: "Object"
    },
    target_page: {
        required: false,
        type: "String"
    },
    target_pages: {
        required: false,
        type: "Array"
    },
    is_active: {
        required: false,
        type: "Boolean"
    },
    hide_sticker: {
        required: false,
        type: "Boolean"
    },
    app_id: {
        required: true,
        type: "String"
    },
    contact_enable: {
        required: false,
        type: "Boolean"
    },
    comment_enable: {
        required: false,
        type: "Boolean"
    },
    trigger_size: {
        required: false,
        type: "String"
    }
};

const widgetPropertyPreprocessors = {
    target_devices: function(targetDevices) {
        try {
            return JSON.parse(targetDevices);
        }
        catch (jsonParseError) {
            if ((targetDevices !== null) && (typeof targetDevices === "object")) {
                return targetDevices;
            }
            else {
                return {
                    desktop: true,
                    phone: true,
                    tablet: true
                };
            }
        }
    },
    target_pages: function(targetPages) {
        try {
            return JSON.parse(targetPages);
        }
        catch (jsonParseError) {
            if (Array.isArray(targetPages)) {
                return targetPages;
            }
            else {
                return ["/"];
            }
        }
    },
    hide_sticker: function(hideSticker) {
        try {
            return !!JSON.parse(hideSticker);
        }
        catch (jsonParseError) {
            return !!hideSticker;
        }
    }
};

(function() {

    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });
    /**
     *    register internalEvent
     */
    plugins.internalEvents.push('[CLY]_star_rating');
    plugins.internalDrillEvents.push("[CLY]_star_rating");
    plugins.internalOmitSegments["[CLY]_star_rating"] = ["email", "comment", "widget_id", "contactMe"];
    var createFeedbackWidget = function(ob) {
        var obParams = ob.params;

        for (let key in widgetPropertyPreprocessors) {
            ob.params.qstring[key] = widgetPropertyPreprocessors[key](ob.params.qstring[key]);
        }

        var validatedArgs = common.validateArgs(ob.params.qstring, widgetProperties, true);
        if (!validatedArgs.result) {
            common.returnMessage(ob.params, 400, "Invalid params: " + validatedArgs.errors.join());
            return false;
        }
        var widget = validatedArgs.obj;
        widget.type = "rating";

        validateCreate(obParams, FEATURE_NAME, function(params) {
            common.db.collection("feedback_widgets").insert(widget, function(err, result) {
                if (!err) {
                    common.returnMessage(ob.params, 201, "Successfully created " + result.insertedIds[0]);
                    plugins.dispatch("/systemlogs", {params: params, action: "feedback_widget_created", data: widget});
                    return true;
                }
                else {
                    common.returnMessage(ob.params, 500, err.message);
                    return false;
                }
            });
        });
        return true;
    };
    var removeFeedbackWidget = function(ob) {
        var obParams = ob.params;
        validateDelete(obParams, FEATURE_NAME, function(params) {
            var widgetId = params.qstring.widget_id;
            var app = params.qstring.app_id;
            var withData = params.qstring.with_data;
            var collectionName = "feedback_widgets";
            common.db.collection(collectionName).findOne({"_id": common.db.ObjectID(widgetId) }, function(err, widget) {
                if (!err && widget) {
                    common.db.collection(collectionName).remove({
                        "_id": common.db.ObjectID(widgetId)
                    }, function(removeWidgetErr) {
                        if (!removeWidgetErr) {
                            // remove widget and related data
                            if (withData) {
                                removeWidgetData(widgetId, app, function(removeError) {
                                    if (removeError) {
                                        common.returnMessage(ob.params, 500, removeError.message);
                                        return false;
                                    }
                                    else {
                                        common.returnMessage(ob.params, 200, 'Success');
                                        plugins.dispatch("/systemlogs", {params: params, action: "feedback_widget_removed_with_data", data: widget});
                                        return true;
                                    }
                                });
                            }
                            // remove only widget
                            else {
                                common.returnMessage(ob.params, 200, 'Success');
                                plugins.dispatch("/systemlogs", {params: params, action: "feedback_widget_removed", data: widget});
                                return true;
                            }
                        }
                        else {
                            common.returnMessage(ob.params, 500, removeWidgetErr.message);
                            return false;
                        }
                    });
                }
                else {
                    common.returnMessage(ob.params, 404, "Widget not found");
                    return false;
                }
            });
        });
        return true;
    };
    var editFeedbackWidget = function(ob) {
        var obParams = ob.params;
        validateUpdate(obParams, FEATURE_NAME, function(params) {
            let widgetId;

            try {
                widgetId = common.db.ObjectID(params.qstring.widget_id);
            }
            catch (e) {
                common.returnMessage(params, 500, 'Invalid widget id.');
                return false;
            }

            for (let key in widgetPropertyPreprocessors) {
                ob.params.qstring[key] = widgetPropertyPreprocessors[key](ob.params.qstring[key]);
            }

            var validatedArgs = common.validateArgs(ob.params.qstring, widgetProperties, true);
            if (!validatedArgs.result) {
                common.returnMessage(ob.params, 400, "Invalid params: " + validatedArgs.errors.join());
                return false;
            }
            var changes = validatedArgs.obj;

            common.db.collection("feedback_widgets").findAndModify({"_id": widgetId}, {}, {$set: changes}, function(err, widget) {
                if (!err && widget) {
                    common.returnMessage(params, 200, 'Success');
                    plugins.dispatch("/systemlogs", {params: params, action: "feedback_widget_edited", data: {before: widget, update: changes}});
                    return true;
                }
                else if (err) {
                    common.returnMessage(params, 500, err.message);
                    return false;
                }
                else {
                    common.returnMessage(params, 404, "Widget not found");
                    return false;
                }
            });
        });
        return true;
    };
    var removeWidgetData = function(widgetId, app, callback) {
        var collectionName = "feedback" + app;
        common.db.collection(collectionName).remove({
            "widget_id": widgetId
        }, function(err) {
            if (!err) {
                callback(null);
            }
            else {
                callback(err);
            }
        });
    };
    var nonChecksumHandler = function(ob) {
        try {
            var events = JSON.parse(ob.params.qstring.events);
            if (events.length !== 1 || events[0].key !== "[CLY]_star_rating") {
                common.returnMessage(ob.params, 400, 'invalid_event_request');
                return false;
            }
            else {
                var params = {
                    no_checksum: true,
                    //providing data in request object
                    'req': {
                        url: "/i?" + ob.params.href.split("/i/feedback/input?")[1]
                    },
                    //adding custom processing for API responses
                    'APICallback': function(err, responseData, headers, returnCode) {
                        //sending response to client
                        if (returnCode === 200) {
                            common.returnOutput(ob.params, JSON.parse(responseData));
                            return true;
                        }
                        else {
                            common.returnMessage(ob.params, returnCode, JSON.parse(responseData).result);
                            return false;
                        }
                    }
                };
                requestProcessor.processRequest(params);
                return true;
            }
        }
        catch (jsonParseError) {
            common.returnMessage(ob.params, 400, 'invalid_event_request');
            return false;
        }
    };

    plugins.register("/i/feedback/input", nonChecksumHandler);
    plugins.register("/i", function(ob) {
        var params = ob.params;
        if (params.qstring.events && params.qstring.events.length && Array.isArray(params.qstring.events)) {
            params.qstring.events = params.qstring.events.filter(function(currEvent) {
                if (currEvent.key === "[CLY]_star_rating") {
                    /**
                    *  register for process new  rating event data.
                    *  the original event format like:
                    *  { key: '[CLY]_star_rating', count:1, sum:1, segmentation:{ platform:"iOS", version:"3.2", rating:2}
                    *  this function will add a field call "platform_version_rate" in segmentation.
                    */
                    currEvent.segmentation.platform = currEvent.segmentation.platform || "undefined"; //because we have a lot of old data with undefined
                    currEvent.segmentation.rating = currEvent.segmentation.rating || "undefined";
                    currEvent.segmentation.widget_id = currEvent.segmentation.widget_id || "undefined";
                    currEvent.segmentation.app_version = currEvent.segmentation.app_version || "undefined";
                    currEvent.segmentation.platform_version_rate = currEvent.segmentation.platform + "**" + currEvent.segmentation.app_version + "**" + currEvent.segmentation.rating + "**" + currEvent.segmentation.widget_id + "**";
                    // is provided email & comment fields
                    if ((currEvent.segmentation.email && currEvent.segmentation.email.length > 0) || (currEvent.segmentation.comment && currEvent.segmentation.comment.length > 0)) {
                        var collectionName = 'feedback' + ob.params.app._id;
                        common.db.collection(collectionName).insert({
                            "email": currEvent.segmentation.email,
                            "comment": currEvent.segmentation.comment,
                            "ts": (currEvent.timestamp) ? common.initTimeObj(params.appTimezone, currEvent.timestamp).timestamp : params.time.timestamp,
                            "device_id": params.qstring.device_id,
                            "cd": new Date(),
                            "uid": params.app_user.uid,
                            "contact_me": currEvent.segmentation.contactMe,
                            "rating": currEvent.segmentation.rating,
                            "platform": currEvent.segmentation.platform,
                            "app_version": currEvent.segmentation.app_version,
                            "widget_id": currEvent.segmentation.widget_id
                        }, function(err) {
                            if (err) {
                                return false;
                            }
                        });
                    }
                }
                return true;
            });
        }
    });
    /*
     * @apiName: CreateFeedbackWidget
     * @type: GET
     * @apiDescription: Create web feedback widget from Countly web application
     * @apiParam: 'popup_header_text', Header text of feedback popup
     * @apiParam: 'popup_email_callout', "Contact me by e-mail" text of
     * feedback popup
     * @apiParam: 'popup_comment_callout', "Add comment" text of feedback popup
     * @apiParam: 'popup_thanks_message', Message of thanks popup
     * @apiParam: 'trigger_position', position of feedback trigger sticky,
     * should be one of these ['mleft','mright','bleft','bright']
     * @apiParam: 'trigger_bg_color', #hex code of background color of feedback
     * trigger sticky button
     * @apiParam: 'trigger_font_color', #hex code of font color of feedback
     * trigger sticky button
     * @apiParam: 'trigger_button_text', text of feedback sticky button
     * @apiParam: 'target_devices', target device array of feedback
     * fe: ['mobile','tablet']
     * @apiParam: 'target_page', target page of feedback, should be one of
     * these values ['all','selected']
     * @apiParam: 'target_pages', if 'target_page' property set as 'selected',
     * this param should be provided as array of selected pages
     * fe: ['/home','/login']
     * @apiParam: 'is_active', is that feedback should set active as default?
     * @apiParam: 'hide_sticker', is that feedback should set hidden as default?
     * @apiParam: 'app_id', app_id of related application
     */
    plugins.register("/i/feedback/widgets/create", createFeedbackWidget);
    /*
     * @apiName: RemoveFeedbackWidget
     * @type: GET
     * @apiDescription: Remove web feedback widget from Countly web application
     * @apiParam: 'widget_id', Id of widget which will be removed
     * @apiParam: 'with_data', Boolean property for remove data belong to widget which will be removed with it
     * @apiParam: 'app_id', app_id of related application
     */
    plugins.register("/i/feedback/widgets/remove", removeFeedbackWidget);
    /*
     * @apiName: EditFeedbackWidget
     * @type: GET
     * @apiDescription: Edit web feedback widget settings from Countly web application
     * @apiParam: 'popup_header_text', Header text of feedback popup
     * @apiParam: 'popup_email_callout', "Contact me by e-mail" text of
     * feedback popup
     * @apiParam: 'popup_comment_callout', "Add comment" text of feedback popup
     * @apiParam: 'popup_thanks_message', Message of thanks popup
     * @apiParam: 'trigger_position', position of feedback trigger sticky,
     * should be one of these ['mleft','mright','bleft','bright']
     * @apiParam: 'trigger_bg_color', #hex code of background color of feedback
     * trigger sticky button
     * @apiParam: 'trigger_font_color', #hex code of font color of feedback
     * trigger sticky button
     * @apiParam: 'trigger_button_text', text of feedback sticky button
     * @apiParam: 'target_devices', target device array of feedback
     * fe: ['mobile','tablet']
     * @apiParam: 'target_page', target page of feedback, should be one of
     * these values ['all','selected']
     * @apiParam: 'target_pages', if 'target_page' property set as 'selected',
     * this param should be provided as array of selected pages
     * fe: ['/home','/login']
     * @apiParam: 'is_active', is that feedback should set active as default?
     * @apiParam: 'app_id', app_id of related application
     */
    plugins.register("/i/feedback/widgets/edit", editFeedbackWidget);
    /*
     * @apiName: GetFeedbackData
     * @apiDescription: Get feedback data with or without filters
     * @apiParam: 'widget_id', Id of related widget
     * @apiParam: 'rating', filter by rating
     * @apiParam: 'device_id', filter by device_id
     * @apiParam: 'app_id', app_id of related application
     */
    plugins.register('/o/feedback/data', function(ob) {
        var params = ob.params;
        var app = params.qstring.app_id;
        var collectionName = 'feedback' + app;
        var query = {};
        var skip = parseInt(params.qstring.iDisplayStart);
        var limit = parseInt(params.qstring.iDisplayLength);
        var colNames = ['rating', 'comment', 'email', 'ts'];

        if (params.qstring.widget_id) {
            query.widget_id = params.qstring.widget_id;
        }
        if (params.qstring.rating) {
            query.rating = parseInt(params.qstring.rating);
        }
        if (params.qstring.version) {
            query.app_version = params.qstring.version;
        }
        if (params.qstring.platform) {
            query.platform = params.qstring.platform;
        }
        if (params.qstring.device_id) {
            query.device_id = params.qstring.device_id;
        }
        if (params.qstring.sSearch && params.qstring.sSearch !== "") {
            query.comment = {"$regex": new RegExp(".*" + params.qstring.sSearch + ".*", 'i')};
        }
        if (params.qstring.iSortCol_0) {
            try {
                var colIndex = parseInt(params.qstring.iSortCol_0);
                var colName = colNames[colIndex];
                var sortType = params.qstring.sSortDir_0 === 'asc' ? 1 : -1;
                var sort = {};
                sort[colName] = sortType;
            }
            catch (e) {
                common.returnMessage(params, 500, 'Invalid column index for sorting');
                return true;
            }
        }

        validateRead(params, FEATURE_NAME, function() {
            query.ts = countlyCommon.getTimestampRangeQuery(params, true);
            var cursor = common.db.collection(collectionName).find(query);
            cursor.count(function(err, total) {
                if (!err) {
                    if (sort) {
                        cursor.sort(sort);
                    }
                    cursor.skip(skip);
                    cursor.limit(limit);
                    cursor.toArray(function(cursorErr, res) {
                        if (!cursorErr) {
                            common.returnOutput(params, {sEcho: params.qstring.sEcho, iTotalRecords: total, iTotalDisplayRecords: total, "aaData": res});
                        }
                        else {
                            common.returnMessage(params, 500, cursorErr);
                        }
                    });
                }
                else {
                    common.returnMessage(params, 500, err);
                }
            });
        });
        return true;
    });
    /*
     * @apiName: GetMultipleWidgetsById
     * @apiDescription: Get feedback widgets with or without filters
     * @apiParam: 'app_key', app_key of related application provided by sdk request
     */
    plugins.register('/o/feedback/multiple-widgets-by-id', function(ob) {
        var params = ob.params;
        var collectionName = 'feedback_widgets';
        if (params.qstring.widgets && params.qstring.widgets.length > 0) {
            var widgets = [];
            try {
                widgets = JSON.parse(params.qstring.widgets);
            }
            catch (jsonParseError) {
                widgets = [];
            }
            var widgetIdsArray = widgets.map(function(d) {
                return common.db.ObjectID(d);
            });
            common.db.collection(collectionName).find({
                _id: {
                    $in: widgetIdsArray
                }
            }).toArray(function(err, docs) {
                if (!err) {
                    common.returnOutput(params, docs);
                    return true;
                }
                else {
                    common.returnMessage(params, 500, err.message);
                    return false;
                }
            });
        }
        else {
            common.returnMessage(params, 500, 'You should provide widget ids array.');
            return false;
        }
        return true;
    });
    /*
     * @apiName: GetWidgetsData
     * @apiDescription: Get feedback widgets with or without filters
     * @apiParam: 'app_id', app_id of related application
     * @apiParam: 'is_active', is_active option for widgets
     */
    plugins.register('/o/feedback/widgets', function(ob) {
        var params = ob.params;
        validateRead(params, FEATURE_NAME, function() {
            var collectionName = 'feedback_widgets';
            var query = {type: "rating"};
            if (params.qstring.is_active) {
                query.is_active = params.qstring.is_active;
            }

            if (params.qstring.app_id) {
                query.app_id = params.qstring.app_id;
            }
            common.db.collection(collectionName).find(query).toArray(function(err, docs) {
                if (!err) {
                    common.returnOutput(params, docs);
                    return true;
                }
                else {
                    common.returnMessage(params, 500, err.message);
                    return false;
                }
            });
        });
        return true;
    });
    /*
     * @apiName: GetOneWidget
     */
    plugins.register('/o/feedback/widget', function(ob) {
        var params = ob.params;
        // check widget_id param is provided?
        if (!params.qstring.widget_id) {
            common.returnMessage(ob.params, 400, 'Missing parameter "widget_id"');
            return true;
        }
        // for request which sent from countly with app_key without app_id
        var widgetId = params.qstring.widget_id;
        var collectionName = 'feedback_widgets';
        try {
            widgetId = common.db.ObjectID(widgetId);
        }
        catch (e) {
            common.returnMessage(params, 500, 'Invalid widget id.');
            return true;
        }
        common.db.collection(collectionName).findOne({
            "_id": widgetId
        }, function(err, doc) {
            if (err) {
                common.returnMessage(params, 500, err.message);
            }
            else if (!doc) {
                common.returnMessage(params, 404, 'Widget not found.');
            }
            else {
                common.returnOutput(params, doc);
            }
        });
        return true;
    });
    /**
     * register for fetching platform and version metadata.
     */
    plugins.register('/o', function(ob) {
        var params = ob.params;
        if (params.qstring.method === 'star') {
            if (params.qstring.period) {
                //check if period comes from datapicker
                if (params.qstring.period.indexOf(",") !== -1) {
                    try {
                        params.qstring.period = JSON.parse(params.qstring.period);
                    }
                    catch (SyntaxError) {
                        common.returnMessage(params, 400, 'Bad request parameter: period');
                        return true;
                    }
                }
                else {
                    switch (params.qstring.period) {
                    case "month":
                    case "day":
                    case "yesterday":
                    case "hour":
                        break;
                    default:
                        if (!/([0-9]+)days/.test(params.qstring.period)) {
                            common.returnMessage(params, 400, 'Bad request parameter: period');
                            return true;
                        }
                        break;
                    }
                }
            }
            else {
                common.returnMessage(params, 400, 'Missing request parameter: period');
                return true;
            }
            countlyCommon.setPeriod(params.qstring.period, true);
            var periodObj = countlyCommon.periodObj;
            var collectionName = 'events' + crypto.createHash('sha1').update('[CLY]_star_rating' + params.qstring.app_id).digest('hex');
            var documents = [];
            for (var i = 0; i < periodObj.reqZeroDbDateIds.length; i++) {
                documents.push("no-segment_" + periodObj.reqZeroDbDateIds[i]);
                for (var m = 0; m < common.base64.length; m++) {
                    documents.push("no-segment_" + periodObj.reqZeroDbDateIds[i] + "_" + common.base64[m]);
                }
            }
            common.db.collection(collectionName).find({
                '_id': {
                    $in: documents
                }
            }).toArray(function(err, docs) {
                if (!err) {
                    var result = {};
                    docs.forEach(function(doc) {
                        if (!doc.meta) {
                            doc.meta = {};
                        }
                        if (!doc.meta.platform_version_rate) {
                            doc.meta.platform_version_rate = [];
                        }
                        if (doc.meta_v2 && doc.meta_v2.platform_version_rate) {
                            common.arrayAddUniq(doc.meta.platform_version_rate, Object.keys(doc.meta_v2.platform_version_rate));
                        }
                        doc.meta.platform_version_rate.forEach(function(item) {
                            var data = item.split('**');
                            if (result[data[0]] === undefined) {
                                result[data[0]] = [];
                            }
                            if (result[data[0]].indexOf(data[1]) === -1) {
                                result[data[0]].push(data[1]);
                            }
                        });
                    });
                    common.returnOutput(params, result);
                    return true;
                }
            });
            return true;
        }
        return false;
    });
    plugins.register("/i/apps/create", function(ob) {
        var appId = ob.appId;
        common.db.collection('feedback' + appId).ensureIndex({
            "uid": 1
        }, function() {});
        common.db.collection('feedback' + appId).ensureIndex({
            "ts": 1
        }, function() {});
    });
    plugins.register("/i/apps/delete", function(ob) {
        var appId = ob.appId;
        common.db.collection('feedback_widgets').remove({
            type: "rating",
            "app_id": appId
        });
        common.db.collection('feedback' + appId).drop(function() {});
        common.db.collection("events" + crypto.createHash('sha1').update("[CLY]_star_rating" + appId).digest('hex')).drop(function() {});
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_star_rating" + appId).digest('hex')).drop(function() {});
        }
    });
    plugins.register("/i/apps/clear", function(ob) {
        var appId = ob.appId;
        common.db.collection('feedback' + appId).remove({
            ts: {
                $lt: ob.moment.unix()
            }
        }, function() {});
        common.db.collection("events" + crypto.createHash('sha1').update("[CLY]_star_rating" + appId).digest('hex')).remove({
            ts: {
                $lt: ob.moment.unix()
            }
        }, function() {});
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_star_rating" + appId).digest('hex')).remove({
                ts: {
                    $lt: ob.moment.unix()
                }
            }, function() {});
        }
    });
    plugins.register("/i/apps/clear_all", function(ob) {
        var appId = ob.appId;
        common.db.collection('feedback' + appId).drop(function() {
            common.db.collection('feedback' + appId).ensureIndex({
                "uid": 1
            }, function() {});
            common.db.collection('feedback' + appId).ensureIndex({
                "ts": 1
            }, function() {});
        });
        common.db.collection("events" + crypto.createHash('sha1').update("[CLY]_star_rating" + appId).digest('hex')).drop(function() {});
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_star_rating" + appId).digest('hex')).drop(function() {});
        }
    });
    plugins.register("/i/apps/reset", function(ob) {
        var appId = ob.appId;
        common.db.collection('feedback_widgets').remove({
            type: "rating",
            "app_id": appId
        });
        common.db.collection('feedback' + appId).drop(function() {
            common.db.collection('feedback' + appId).ensureIndex({
                "uid": 1
            }, function() {});
            common.db.collection('feedback' + appId).ensureIndex({
                "ts": 1
            }, function() {});
        });
        common.db.collection("events" + crypto.createHash('sha1').update("[CLY]_star_rating" + appId).digest('hex')).drop(function() {});
        if (common.drillDb) {
            common.drillDb.collection("drill_events" + crypto.createHash('sha1').update("[CLY]_star_rating" + appId).digest('hex')).drop(function() {});
        }
    });
    plugins.register("/i/device_id", function(ob) {
        var appId = ob.app_id;
        var oldUid = ob.oldUser.uid;
        var newUid = ob.newUser.uid;
        if (oldUid !== newUid) {
            common.db.collection("feedback" + appId).update({
                uid: oldUid
            }, {
                '$set': {
                    uid: newUid
                }
            }, {
                multi: true
            }, function() {});
        }
    });
    plugins.register("/i/app_users/delete", function(ob) {
        var appId = ob.app_id;
        var uids = ob.uids;
        if (uids && uids.length) {
            common.db.collection("feedback" + appId).remove({
                uid: {
                    $in: uids
                }
            }, function() {});
        }
    });
    plugins.register("/i/app_users/export", function(ob) {
        return new Promise(function(resolve) {
            var uids = ob.uids;
            if (uids && uids.length) {
                if (!ob.export_commands.feedback) {
                    ob.export_commands.feedback = [];
                }
                ob.export_commands.feedback.push({cmd: 'mongoexport', args: [...ob.dbargs, '--collection', 'feedback' + ob.app_id, '-q', '{"uid":{"$in": ["' + uids.join('","') + '"]}}', '--out', ob.export_folder + '/feedback' + ob.app_id + '.json']});
                resolve();
            }
        });
    });

    plugins.register("/export", async function({plugin, selectedIds}) {
        if (plugin === "feedback_widgets") {
            const data = await exportPlugin(selectedIds);
            return data;
        }
    });

    plugins.register("/import", async function({params, importData}) {
        if (importData.name === 'feedback_widgets') {
            await importPopulator(params, importData);
            return true;
        }
        return false;
    });

    plugins.register("/import/validate", function({params, pluginData, pluginName}) {
        if (pluginName === 'feedback_widgets') {
            return validateImport(params, pluginData);
        }
        else {
            return false;
        }
    });

    /**
     * 
     * @param {String[]} ids ids of documents to be exported
     * @param {String} app_id app Id
     */
    async function exportPlugin(ids) {
        const data = await common.db.collection("feedback_widgets").find({_id: {$in: ids.map((id) => common.db.ObjectID(id))}}).toArray();
        data.forEach(((widget) => {
            widget.app_id = "APP_ID";
        }));
        const dependencies = [];

        return {
            name: 'feedback_widgets',
            data: data,
            dependencies: dependencies
        };
    }

    /**
     * Validation before import
     * 
     * @param {Object} params params object 
     * @param {Object} widget feedback widget Object
     * @returns {Promise<Object>} validation result
    */
    function validateImport(params, widget) {
        return {
            code: 200,
            message: "Success",
            data: {
                newId: common.db.ObjectID(),
                oldId: widget._id
            }
        };
    }

    /**
     * Insert Feedback Objects
     * 
     * @param {Object} params params object
     * @param {Object} importData iomport data Object - MUTABLE
     * @returns {Promise} promise array of all inserts
     */
    function importPopulator(params, importData) {
        const widget = importData.data;
        return new Promise((resolve, reject) => {
            widget._id = common.db.ObjectID(widget._id);
            common.db.collection('feedback_widgets').insert(widget, function(err) {
                if (!err) {
                    plugins.dispatch("/systemlogs", {params: params, action: "feedback_widget_created", data: widget});
                    return resolve();
                }
                else {
                    return reject();
                }
            });
        });
    }

    plugins.register("/email/report", async function(ob) {
        const {params, metric} = ob;
        const {report, app, member} = params;
        try {
            if (metric !== 'star-rating') {
                return;
            }
            const calCumulativeData = function(result, periodArray) {
                const cumulativeData = [
                    { count: 0, percent: 0 },
                    { count: 0, percent: 0 },
                    { count: 0, percent: 0 },
                    { count: 0, percent: 0 },
                    { count: 0, percent: 0 },
                ];

                for (var i = 0; i < periodArray.length; i++) {
                    var dateArray = periodArray[i].split('.');
                    var year = dateArray[0];
                    var month = dateArray[1];
                    var day = dateArray[2];
                    if (result[year] && result[year][month] && result[year][month][day]) {
                        for (var rating in result[year][month][day]) {
                            var rank = (rating.split("**"))[2];
                            if (cumulativeData[rank - 1]) {
                                cumulativeData[rank - 1].count += result[year][month][day][rating].c;
                            }
                        }
                    }
                }
                return cumulativeData;
            };

            /**
             * fetch event data
             * @return {object} - promise object
             **/
            const fetchData = () => {
                return new Promise((resolve) => {
                    const starRatingCollection = 'events' + crypto.createHash('sha1').update('[CLY]_star_rating' + app._id).digest('hex');
                    fetch.fetchTimeObj(
                        starRatingCollection,
                        {
                            app_id: "platform_version_rate",
                            qstring: {
                                period: report.period,
                            }
                        },
                        false,
                        function(result) {
                            const periodObj = countlyCommon.getPeriodObj({qstring: {period: report.period}, app: app});
                            const {currentPeriodArr, previousPeriodArr} = periodObj;
                            const currentData = calCumulativeData(result, currentPeriodArr);
                            const previousData = calCumulativeData(result, previousPeriodArr);
                            let sum = 0;
                            currentData.forEach((item, index) => {
                                sum += item.count;
                                if (previousData[index].count > 0) {
                                    item.change = (((item.count / previousData[index].count) - 1) * 100).toFixed(2) + "%";
                                }
                                else {
                                    item.change = 'NA';
                                }
                            });
                            currentData.forEach((item) => {
                                if (sum > 0) {
                                    item.percent = ((item.count / sum) * 100).toFixed(2) + "%";
                                }
                            });
                            resolve(currentData);
                        }
                    );
                });
            };
            const results = await fetchData();
            const coloums = {
                name: "star.rating",
                count: "star.number-of-ratings-cap",
                percent: "star.percentage-cap",
                change: "star.change",
            };

            const columsString = [];
            for (let ck in coloums) {
                const col = await reportUtils.getLocaleLangString(member.lang, coloums[ck]);
                columsString.push(col);
            }

            const tableData = [];
            const keyIndex = ['one', 'two', 'three', 'four', 'five'];
            for (let i = 0; i < results.length; i++) {
                const ratingTitle = await reportUtils.getLocaleLangString(member.lang, 'star.' + keyIndex[i] + '-star');
                const data = results[i];
                const row = [ratingTitle, data.count, data.percent, data.change];
                tableData.push(row);
            }

            const result = {
                title: await reportUtils.getLocaleLangString(member.lang, "reports.star-rating"),
                colums: columsString,
                table: tableData,
            };
            const templateString = await reportUtils.readReportTemplate(path.resolve(__dirname, '../frontend/public/templates/report.html'));
            const reportString = ejs.render(templateString, {...result});
            ob.reportAPICallback(null, {html: reportString});
            return;
        }
        catch (err) {
            console.log(err);
            ob.reportAPICallback(err, null);
        }
    });
}(exported));
module.exports = exported;
