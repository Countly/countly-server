var exported = {},
    requestProcessor = require('../../../api/utils/requestProcessor'),
    common = require('../../../api/utils/common.js'),
    crypto = require('crypto'),
    log = common.log('star-rating:api'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    plugins = require('../../pluginManager.js'),
    { validateCreate, validateRead, validateUpdate, validateDelete } = require('../../../api/utils/rights.js'),
    countlyFs = require('../../../api/utils/countlyFs.js');
var fetch = require('../../../api/parts/data/fetch.js');
var ejs = require("ejs"),
    fs = require('fs'),
    path = require('path'),
    reportUtils = require('../../reports/api/utils.js');

var cohortsEnabled = plugins.getPlugins().indexOf('cohorts') > -1;
var surveysEnabled = plugins.getPlugins().indexOf('surveys') > -1;

if (cohortsEnabled) {
    var cohorts = require('../../cohorts/api/parts/cohorts');
}

const FEATURE_NAME = 'star_rating';

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
    },
    targeting: {
        required: false,
        type: "Object"
    },
    ratings_texts: {
        required: false,
        type: "Array"
    },
    rating_symbol: {
        required: false,
        type: "String"
    },
    status: {
        required: true,
        type: "Boolean"
    },
    logo: {
        required: false,
        type: "String"
    },
    appearance: {
        required: false,
        type: "Object"
    },
    showPolicy: {
        required: false,
        type: "String"
    },
    target_page: {
        required: false,
        type: "String"
    },
    target_pages: {
        required: false,
        type: "Array"
    }
};

const widgetPropertyPreprocessors = {
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
    targeting: function(targeting) {
        try {
            return JSON.parse(targeting);
        }
        catch (jsonParseError) {
            return null;
        }
    },
    ratings_texts: function(ratingsTexts) {
        try {
            return JSON.parse(ratingsTexts);
        }
        catch (jsonParseError) {
            if (Array.isArray(ratingsTexts)) {
                return ratingsTexts;
            }
            else {
                return [
                    'Very dissatisfied',
                    'Somewhat dissatisfied',
                    'Neither satisfied Nor Dissatisfied',
                    'Somewhat Satisfied',
                    'Very Satisfied'
                ];
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
    },
    status: function(status) {
        try {
            return !!JSON.parse(status);
        }
        catch (jsonParseError) {
            return !!status;
        }
    }
};

/**
* Function to ensure we hav directory to upload files to
* @param {function} callback - callback
**/
function create_upload_dir(callback) {
    var dir = path.resolve(__dirname, './../images');
    fs.mkdir(dir, function(err) {
        if (err) {
            if (err.code === 'EEXIST') {
                callback(true);
            }
            else {
                callback(false);
            }
        }
        else {
            callback(true);
        }
    });
}

/**
* Used for file upload
* @param {object} myfile - file object(if empty - returns)
* @param {string} id - unique identifier
* @param {function} callback = callback function
**/
function uploadFile(myfile, id, callback) {
    if (!myfile) {
        callback(true);
        return;
    }
    var tmp_path = myfile.path;
    var type = myfile.type;
    myfile.name = myfile.name || "png";
    if (type !== "image/png" && type !== "image/gif" && type !== "image/jpeg") {
        fs.unlink(tmp_path, function() { });
        callback("Invalid image format. Must be png or jpeg");
        return;
    }

    var allowedExtensions = ["gif", "jpeg", "jpg", "png"];
    var ext = myfile.name.split(".");
    ext = ext[ext.length - 1];

    if (allowedExtensions.indexOf(ext) === -1) {
        callback("Invalid file extension. Must be .png, .jpg, .gif or .jpeg");
        return;
    }

    create_upload_dir(function() {
        fs.readFile(tmp_path, (err, data) => {
            if (err) {
                callback("Failed to upload image");
                return;
            }
            //convert file to data
            if (data) {
                try {
                    var pp = path.resolve(__dirname, './../images/' + id + "." + ext);
                    countlyFs.saveData("star-rating", pp, data, { id: "" + id + "." + ext, writeMode: "overwrite" }, function(err3) {
                        if (err3) {
                            callback("Failed to upload image");
                        }
                        else {
                            fs.unlink(tmp_path, function() { });
                            callback(true, id + "." + ext);
                        }
                    });
                }
                catch (SyntaxError) {
                    callback("Failed to upload image");
                }
            }
            else {
                callback("Failed to upload image");
            }
        });
    });
}

(function() {
    plugins.register("/permissions/features", function(ob) {
        ob.features.push(FEATURE_NAME);
    });

    /**
     * @api {get} /o/sdk Get ratings widgets
     * @apiName GetWidgets
     * @apiGroup Ratings
     *
     * @apiDescription Return feedback widgets as array, only works when surveys plugin disabled
     * @apiQuery {String} method which kind feedback widgets requested, it should be 'feedback'
     * @apiQuery {String} app_key app key value for related app that can be obtain from countly dashboard
     * @apiQuery {String} device_id unique identifier for related device
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *  "result": [{
     *    "_id": "62543b95a3a03e229a389a54",
     *    "type": "rating",
     *    "showPolicy": "afterPageLoad",
     *    "appearance": {
     *      "position": "mleft",
     *      "bg_color": "#123456",
     *      "text_color": "#fff",
     *      "text": "Feedback",
     *      "size": "m"
     *    },
     *    "tg": [
     *      "/"
     *    ],
     *    "name": "What's your opinion about this page?"
     *  }]
     * }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Missing parameter \"app_key\" or \"device_id\""" 
     * }
     */
    plugins.register("/o/sdk", function(ob) {
        var params = ob.params;
        // do not respond if this isn't feedback fetch request 
        // or surveys plugin enabled
        if (params.qstring.method !== "feedback" || surveysEnabled) {
            return false;
        }

        return new Promise(function(resolve) {
            var widgets = [];
            plugins.dispatch("/feedback/widgets", { params: params, widgets: widgets }, function() {
                common.returnMessage(params, 200, widgets);
                return resolve(true);
            });
        });
    });

    /*
    * internal event that fetch ratings widget
    * and push them to passed widgets array.
    */
    plugins.register("/feedback/widgets", function(ob) {
        return new Promise(function(resolve, reject) {
            var params = ob.params;
            params.qstring.app_id = params.app_id;
            params.app_user = params.app_user || {};

            var user = JSON.parse(JSON.stringify(params.app_user));
            common.db.collection('feedback_widgets').find({"app_id": params.app_id + "", "status": true, type: "rating"}, {_id: 1, popup_header_text: 1, cohortID: 1, type: 1, appearance: 1, showPolicy: 1, trigger_position: 1, hide_sticker: 1, trigger_bg_color: 1, trigger_font_color: 1, trigger_button_text: 1, trigger_size: 1, target_pages: 1}).toArray(function(err, widgets) {
                if (err) {
                    log.e(err);
                    reject(err);
                }

                widgets = widgets.map((widget) => {
                    widget.appearance = {};
                    widget.appearance.position = widget.trigger_position;
                    widget.appearance.bg_color = widget.trigger_bg_color;
                    widget.appearance.text_color = widget.trigger_font_color;
                    widget.appearance.text = widget.trigger_button_text;
                    widget.appearance.size = widget.trigger_size;
                    if (widget.hide_sticker) {
                        widget.appearance.hideS = true;
                    }
                    widget.tg = widget.target_pages;
                    widget.name = widget.popup_header_text;
                    // remove this props from response
                    delete widget.hide_sticker;
                    delete widget.trigger_position;
                    delete widget.trigger_bg_color;
                    delete widget.trigger_font_color;
                    delete widget.trigger_button_text;
                    delete widget.trigger_size;
                    delete widget.target_pages;
                    delete widget.popup_header_text;
                    return widget;
                });

                if (widgets && widgets.length > 0) {
                    //filter out based on cohorts
                    if (cohortsEnabled) {
                        widgets = widgets.filter(function(widget) {
                            if (widget.cohortID) {
                                if (user && user.chr && user.chr[widget.cohortID] && user.chr[widget.cohortID].in === 'true') {
                                    delete widget.cohortID; //no need to return more data than needed
                                    return true;
                                }
                                else {
                                    delete widget.cohortID; //no need to return more data than needed
                                    return false;
                                }
                            }
                            else {
                                return true;
                            }
                        });
                    }
                    // concat with tricky way
                    ob.widgets.push.apply(ob.widgets, widgets);
                }
                resolve();
            });
        });
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
        var type = "rating";
        // yes it should be string, not boolean
        widget.is_active = widget.status ? "true" : "false";
        widget.type = type;
        widget.created_at = Date.now();
        widget.timesShown = 0;
        widget.ratingsCount = 0;
        widget.ratingsSum = 0;
        widget.showPolicy = "afterPageLoad";
        widget.appearance = {};
        widget.target_devices = {
            desktop: true,
            phone: true,
            tablet: true
        };

        //widget.created_by = common.db.ObjectID(obParams.member._id);
        validateCreate(obParams, FEATURE_NAME, function(params) {
            common.db.collection("feedback_widgets").insert(widget, function(err, result) {
                if (!err) {
                    if (cohortsEnabled && widget.targeting) {
                        widget.targeting.app_id = params.app_id + "";//has to be string
                        // eslint-disable-next-line
                        createCohort(params, type, result.insertedIds[0], widget.targeting, function(cohortId) { //create cohort using this 
                            if (cohortId) {
                                //update widget record to have this cohortId
                                common.db.collection("feedback_widgets").findAndModify({ "_id": result.insertedIds[0] }, {}, { $set: { "cohortID": cohortId } }, function(err1 /*, widget*/) {
                                    if (err1) {
                                        log.e(err1);
                                    }
                                    else {
                                        common.returnMessage(params, 201, "Successfully created " + result.insertedIds[0]);
                                        plugins.dispatch("/systemlogs", {params: params, action: "feedback_widget_created", data: widget});
                                    }
                                });
                            }
                            else {
                                common.returnMessage(params, 400, { "error": "Failed to set cohort", "widgetId": result.insertedIds[0] });
                            }
                        });
                    }
                    else {
                        common.returnMessage(params, 201, "Successfully created " + result.insertedIds[0]);
                        plugins.dispatch("/systemlogs", {params: params, action: "feedback_widget_created", data: widget});
                    }
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
                            if (cohortsEnabled && widget.cohortID) {
                                // eslint-disable-next-line
                                deleteCohort(widget.cohortID, widget.app_id + "");
                            }
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
            var type = "rating";

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

            if (changes.status) {
                changes.is_active = changes.status ? "true" : "false";
            }

            common.db.collection("feedback_widgets").findAndModify({"_id": widgetId }, {}, {$set: changes}, function(err, widget) {
                if (!err && widget) {
                    widget = widget.value;
                    if (cohortsEnabled && (widget.cohortID && !changes.targeting) || JSON.stringify(changes.targeting) !== JSON.stringify(widget.targeting)) {
                        if (widget.cohortID) {
                            if (changes.targeting) { //we are not setting to empty one
                                //changes.targeting.app_id = widget.app_id + "";
                                changes.targeting.steps = JSON.parse(changes.targeting.steps);
                                changes.targeting.user_segmentation = JSON.parse(changes.targeting.user_segmentation);
                                //changes.targeting = JSON.parse(changes.targeting);
                                common.db.collection('cohorts').findAndModify({ _id: widget.cohortID }, {}, { $set: changes.targeting }, { new: true }, function(err2, res) {
                                    if (err2) {
                                        common.returnMessage(params, 400, "widget updated. Error to update cohort");
                                    }
                                    else {
                                        common.returnMessage(params, 200, "Success");
                                        plugins.dispatch("/systemlogs", { params: params, action: "cohort_edited", data: { update: changes.targeting } });
                                        cohorts.calculateSteps(params, common, res.value, function() { });
                                    }
                                });
                            }
                            else { //we have to delete that cohort
                                // eslint-disable-next-line
                                deleteCohort(widget.cohortID, widget.app_id + "");
                                common.db.collection("feedback_widgets").findAndModify({"_id": widgetId}, {}, {$unset: {"cohortID": ""}}, function(err4/*, widget*/) { //updating record to do not contain cohortID. 
                                    if (err4) {
                                        log.e(err4);
                                    }
                                    common.returnMessage(params, 200, "Success");
                                });
                            }
                        }
                        else {
                            changes.targeting.app_id = params.app_id + "";//has to be string
                            // eslint-disable-next-line
                            createCohort(params, type, widgetId, changes.targeting, function(cohortId) { //create cohort using this 
                                if (cohortId) {
                                    //update widget record to have this cohortId
                                    common.db.collection("feedback_widgets").findAndModify({ "_id": widgetId }, {}, { $set: { "cohortID": cohortId } }, function(/*err, widget*/) {
                                        common.returnMessage(params, 200, "Success");
                                    });
                                }
                                else {
                                    common.returnMessage(params, 400, "widget updated. Error to create cohort");
                                }
                            });
                        }
                    }
                    else {
                        common.returnMessage(params, 200, "Success");
                    }
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
    var increaseWidgetShowCount = function(ob) {
        var obParams = ob.params;
        var widgetId = obParams.qstring.widget_id;

        common.db.collection("feedback_widgets").update({"_id": common.db.ObjectID(widgetId)}, { $inc: { timesShown: 1 } }, function(err, widget) {
            if (!err && widget) {
                return true;
            }
            else if (err) {
                log.e('increaseWidgetShowCount: ' + err);
                return false;
            }
            else {
                log.e('increaseWidgetShowCount: widget not found');
                return false;
            }
        });
        return true;
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

    /**
    * @api {post} /i/feedback/logo Upload logo for ratings widget
    * @apiName UploadWidgetLogo
    * @apiGroup Ratings
    * 
    * @apiDescription Upload custom logo for feedback widget (Requires CREATE permission for Ratings)
    * @apiBody {String} logo Logo file
    * @apiQuery {String} identifier Identifier for file that will be uploaded
    * @apiQuery {String} api_key' API Key that can be obtained from Countly dashboard
    * 
    * @apiSuccessExample {json} Success-Response
    * HTTP/1.1 200 OK
    * {
    *  "result": "identifier.png"
    * }
    *
    * @apiErrorExample {json} Error-Response
    * HTTP/1.1 400 Bad Request
    * {
    *  "result": "Missing parameter \"api_key\" or \"auth_token\""" 
    * }
    */
    plugins.register("/i/feedback/logo", function(ob) {
        var params = ob.params;
        validateCreate(params, FEATURE_NAME, function() {
            uploadFile(params.files.logo, params.qstring.identifier, function(good, filename) { //will return as good if no file
                if (typeof good === 'boolean' && good) {
                    common.returnMessage(params, 200, filename);
                }
                else {
                    common.returnMessage(params, 400, good);
                }
            });
        });
        return true;
    });

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

                    var collectionName = 'feedback' + ob.params.app._id;
                    common.db.collection(collectionName).insert({
                        "email": currEvent.segmentation.email || "No email provided",
                        "comment": currEvent.segmentation.comment || "No comment provided",
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
                    // increment ratings count for widget
                    common.db.collection('feedback_widgets').update({
                        _id: common.db.ObjectID(currEvent.segmentation.widget_id)
                    }, {
                        $inc: { ratingsSum: currEvent.segmentation.rating, ratingsCount: 1 }
                    }, function(err) {
                        if (err) {
                            return false;
                        }
                    });
                }
                return true;
            });
        }
    });
    /**
     * @api {post} /i/feedback/widgets/create Create new widget
     * @apiName CreateRatingsWidget
     * @apiGroup Ratings
     * 
     * @apiDescription Create web feedback widget from Countly web application
     * @apiBody {String} popup_header_text Header text of feedback popup
     * @apiBody {String} popup_email_callout "Contact me by e-mail" text of feedback popup
     * @apiBody {String} popup_comment_callout "Add comment" text of feedback popup
     * @apiBody {String} popup_thanks_message Message of thanks popup
     * @apiBody {String} trigger_position position of feedback trigger sticky should be one of these ['mleft','mright','bleft','bright']
     * @apiBody {String} trigger_bg_color #hex code of background color of feedback trigger sticky button
     * @apiBody {String} trigger_font_color #hex code of font color of feedback trigger sticky button
     * @apiBody {String} trigger_button_text text of feedback sticky button
     * @apiBody {String} target_page target page of feedback, should be one of these values ['all','selected']
     * @apiBody {String} target_pages if 'target_page' property set as 'selected' this param should be provided as array of selected pages fe: ['/home','/login']
     * @apiBody {Boolean} status is that feedback widget will be active or not
     * @apiBody {String} logo filename of logo which uploaded before
     * @apiBody {String} hide_sticker is that feedback should set hidden as default?
     * @apiBody {String} app_id app_id of related application
     * @apiBody {String} targeting Targeting object for feedback widget that contain conditions for appear
     * @apiBody {String} ratings_symbol symbol kind of ratings popup, 'emojis' as default
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 201 Created
     * {
     *  "result": "Successfully created 6256d161e8faa7b449e2dd6b"
     * }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Invalid params: \"popup_header_text\""
     * }
     */
    plugins.register("/i/feedback/widgets/create", createFeedbackWidget);
    /**
     * @api {post} /i/feedback/widgets/remove Remove widget
     * @apiName RemoveWidget
     * @apiGroup Ratings
     * 
     * @apiDescription Remove feedback widget
     * @apiBody {String} widget_id Id of widget which will be removed
     * @apiBody {Boolean} with_data Property for remove data belong to widget which will be removed with it
     * @apiBody {String} app_id app_id of related application
     * 
     * @apiSuccessExample {json} Success-Response
     * HTTP/1.1 200 OK
     * {
     *  "result": "Success"
     * }
     * 
     * @apiErrorExample {json} Error-Response
     * HTTP/1.1 404 Not Found
     * {
     *  "result": "Widget not found"
     * }
     */
    plugins.register("/i/feedback/widgets/remove", removeFeedbackWidget);
    /**
     * @api {post} /i/feedback/widgets/update Update widget
     * @apiName UpdateWidget
     * @apiGroup Ratings
     * 
     * @apiDescription Edit web feedback widget settings from Countly web application
     * @apiBody {String} popup_header_text Header text of feedback popup
     * @apiBody {String} popup_email_callout "Contact me by e-mail" text of feedback popup
     * @apiBody {String} popup_comment_callout "Add comment" text of feedback popup
     * @apiBody {String} popup_thanks_message Message of thanks popup
     * @apiBody {String} trigger_position position of feedback trigger sticky should be one of these ['mleft','mright','bleft','bright']
     * @apiBody {String} trigger_bg_color #hex code of background color of feedback trigger sticky button
     * @apiBody {String} trigger_font_color #hex code of font color of feedback trigger sticky button
     * @apiBody {String} trigger_button_text text of feedback sticky button
     * @apiBody {String} target_page Target page of feedback, should be one of these values ['all','selected']
     * @apiBody {String} target_pages if 'target_page' property set as 'selected', this param should be provided as array of selected pages fe: ['/home','/login']
     * @apiBody {Boolean} status is that feedback widget will be active or not
     * @apiBody {String} logo filename of logo which uploaded before
     * @apiBody {String} hide_sticker is that feedback should set hidden as default?
     * @apiBody {String} app_id app_id of related application
     * @apiBody {String} targeting Targeting object for feedback widget that contain conditions for appear
     * @apiBody {String} ratings_symbol Symbol type of ratings popup, 'emojis' as default
     * 
     * @apiSuccessExample {json} Success-Response
     * HTTP/1.1 200 OK
     * {
     *  "result": "Successfully updated 6256d161e8faa7b449e2dd6b"
     * }
     * 
     * @apiErrorExample {json} Error-Response
     * HTTP/1.1 500 Bad Request
     * {
     *  "result": "Invalid widget id."
     * }
     * 
     * @apiErrorExample {json} Error-Response
     * HTTP/1.1 400 Bad Request
     * {
     *  "result": "Invalid params: \"popup_header_text\""
     * }
     * 
     * @apiErrorExample {json} Error-Response
     * HTTP/1.1 404 Not Found
     * {
     *  "result": "Widget not found"
     * }
     */
    plugins.register("/i/feedback/widgets/edit", editFeedbackWidget);
    /**
     * @api {get} /o/feedback/data Get feedback data
     * @apiName GetFeedbackData
     * @apiGroup Ratings
     * 
     * @apiDescription Get feedback data with or without filters
     * @apiQuery {String} app_id app_id of related application
     * @apiQuery {String} period array that contain start and end date as timestamp
     * @apiQuery {String} widget_id Id of related widget
     * @apiQuery {String} rating Rating filter between 1 and 5
     * @apiQuery {String} comment Comment filter
     * @apiQuery {String} version App version filter like 1.0.1
     * @apiQuery {String} platform Platform filter like 'iOS'
     * @apiQuery {String} device_id Device id value for cases that you need to fetch data for specific device
     * @apiQuery {String} uid User id value
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *  "iTotalRecords": 0,
     *  "iTotalDisplayRecords": 0,
     *  "aaData": []
     * }
     */
    plugins.register('/o/feedback/data', function(ob) {
        var params = ob.params;
        var app = params.qstring.app_id;
        var collectionName = 'feedback' + app;
        var query = {};
        var skip = parseInt(params.qstring.iDisplayStart || 0);
        var limit = parseInt(params.qstring.iDisplayLength || 0);
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
                common.returnMessage(params, 400, 'Invalid column index for sorting');
                return true;
            }
        }
        if (params.qstring.uid) {
            query.uid = params.qstring.uid;
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
     * @apiName: GetMultipleWidgetsById (deprecated)
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
                    if (docs.length) {
                        common.returnOutput(params, docs);
                        return true;
                    }
                    else {
                        if (ob.from_survey) {
                            common.returnMessage(params, 404, 'Widgets not found.');
                        }
                        else {
                            common.returnOutput(params, docs);
                        }
                        return true;
                    }
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
    /**
     * @api {get} /o/feedback/widgets Get feedback widgets
     * @apiName GetWidgets
     * @apiGroup Ratings
     * 
     * @apiDescription Get feedback widgets with or without filters
     * @apiQuery {String} app_id app_id of related application
     * @apiQuery {Boolean} is_active is_active option for widgets
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * [ 
     *  {
     *   "_id": "60f12b92c1c9d0116e01d976",
     *   "popup_header_text": "What&#39;s your opinion about this page?",
     *   "popup_comment_callout": "Add comment",
     *   "popup_email_callout": "Contact me by e-mail",
     *   "popup_button_callout": "Send feedback",
     *   "popup_thanks_message": "Thanks for feedback!",
     *   "trigger_position": "mleft",
     *   "trigger_bg_color": "#fff",
     *   "trigger_font_color": "#ddd",
     *   "trigger_button_text": "Feedback",
     *   "target_devices": {
     *     "phone": true,
     *     "tablet": false,
     *     "desktop": true
     *   },
     *   "target_page": "selected",
     *   "target_pages": [
     *     "/"
     *   ],
     *   "is_active": "true",
     *   "hide_sticker": false,
     *   "app_id": "5e217f4e29ae905af43c2e40",
     *   "type": "rating",
     *   "ratingsCount": 5,
     *   "ratingsSum": 14
     *   }
     * ]
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
    /**
     * @api {get} /o/feedback/widgets Get single widget
     * @apiName GetOneWidget
     * @apiGroup Ratings
     * 
     * @apiDescription Get feedback widget by id
     * @apiQuery {String} api_key api_key that will be used for authentication, can be obtained from Countly server
     * @apiQuery {String} app_id app_id of related application
     * @apiQuery {String} widget_id id of the widget
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *  "_id": "60f12b92c1c9d0116e01d976",
     *  "popup_header_text": "What&#39;s your opinion about this page?",
     *  "popup_comment_callout": "Add comment",
     *  "popup_email_callout": "Contact me by e-mail",
     *  "popup_button_callout": "Send feedback",
     *  "popup_thanks_message": "Thanks for feedback!",
     *  "trigger_position": "mleft",
     *  "trigger_bg_color": "#fff",
     *  "trigger_font_color": "#ddd",
     *  "trigger_button_text": "Feedback",
     *  "target_devices": {
     *   "phone": true,
     *   "tablet": false,
     *  "desktop": true
     *  },
     *  "target_page": "selected",
     *  "target_pages": [
     *  "/"
     *  ],
     *  "is_active": "true",
     *  "hide_sticker": false,
     *  "app_id": "5e217f4e29ae905af43c2e40",
     *  "type": "rating",
     *  "ratingsCount": 5,
     *  "ratingsSum": 14
     *  }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 404 Not Found
     * {
     *  "error": "Feedback widget not found"
     * }
     * 
     * * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "error": "Missing parameter \"widget_id\""
     * }
     */
    plugins.register('/o/feedback/widget', function(ob) {
        var params = ob.params;
        var widgetId = params.qstring.widget_id;
        var collectionName = 'feedback_widgets';

        try {
            widgetId = common.db.ObjectID(params.qstring.widget_id);
        }
        catch (e) {
            log.e(e);
            common.returnMessage(params, 400, 'Missing parameter "widget_id"');
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
                // not from dashboard
                if (params.qstring.nfd) {
                    increaseWidgetShowCount(ob);
                }
                common.returnOutput(params, doc);
            }
        });
        return true;
    });
    /**
     * @api {get} /o Get meta data for ratings
     * @apiName RatingsMetaData
     * @apiGroup Ratings
     * 
     * @apiDescription Get feedback widget meta data
     * @apiQuery method should be "star"
     * @apiQuery app_id app_id of related application
     * @apiQuery period period of the data, as timestamp array or string like "30days"
     * 
     * @apiSuccessExample {json} Success-Response:
     * HTTP/1.1 200 OK
     * {
     *   "MacOS": [
     *     "1:3",
     *     "3:2"
     *   ],
     *   "Android": [
     *     "3:2",
     *     "1:7"
     *   ],
     *   "iOS": [
     *     "1:1",
     *     "2:5"
     *   ],
     *   "Windows Phone": [
     *     "2:0",
     *     "2:3"
     *   ],
     *   "Windows": [
     *     "1:9",
     *     "2:1"
     *   ]
     * }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "error": "Missing parameter \"app_id\""
     * }
     * 
     * @apiErrorExample {json} Error-Response:
     * HTTP/1.1 400 Bad Request
     * {
     *  "error": "Missing parameter \"period\""
     * }
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
    plugins.register("/i/app_users/delete", async function(ob) {
        var appId = ob.app_id;
        var uids = ob.uids;
        if (uids && uids.length) {
            // By using await and no callback, error in db operation will be thrown
            // This error will then be caught by app users api dispatch so that it can cancel app user deletion
            await common.db.collection("feedback" + appId).remove({ uid: { $in: uids } });
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

    if (cohortsEnabled) {
        /**
        * Create Cohort with passed arguments
        * @param {object} params - params
        * @param {string} type - type
        * @param {object} id - id
        * @param {object} newAtt - newAtt
        * @param {string} callback - callback
        **/
        function createCohort(params, type, id, newAtt, callback) { // eslint-disable-line
            newAtt.cohort_name = "[CLY]_" + type + id;

            if (!newAtt.user_segmentation || !newAtt.user_segmentation.query) {
                newAtt.user_segmentation.query = "{}";
                newAtt.user_segmentation.queryText = "{}";
            }

            var cohortId = common.crypto.createHash('md5').update(newAtt.steps + newAtt.app_id + Date.now() + newAtt.cohort_name).digest('hex');

            cohorts.createCohort(common, params, {
                _id: cohortId,
                app_id: newAtt.app_id,
                name: newAtt.cohort_name,
                type: "auto",
                steps: JSON.parse(newAtt.steps),
                user_segmentation: JSON.parse(newAtt.user_segmentation)
            }, function(cohortResult) {
                cohorts.calculateSteps(params, common, cohortResult, function() {});
                return callback(cohortResult._id);
            });
        }

        /**
         * Remove cohort
         * @param {*} cohortId  - cohort id
         * @param {*} appId  - application id
         */
        function deleteCohort(cohortId, appId) { // eslint-disable-line
            common.db.collection('cohorts').findOne({ "_id": cohortId}, function(er, cohort) {
                if (cohort) {
                    plugins.dispatch("/cohort/delete", { "_id": cohortId, "app_id": appId + "", ack: 0 }, function() {
                        common.db.collection('cohorts').remove({ "_id": cohortId }, function() {
                            common.db.collection('cohortdata').remove({ '_id': { $regex: cohortId + ".*" } }, function() { });
                            common.db.collection('app_users' + appId).update({}, { $unset: { ["chr." + cohortId]: "" } }, { multi: true }, function() { });
                        });

                        // plugins.dispatch("/systemlogs", {params: params, action: "cohort_deleted", data: cohort});
                    });
                }
            });
        }
    }
}(exported));
module.exports = exported;