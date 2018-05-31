var plugin = {},
    common = require('../../../api/utils/common.js'),
    crypto = require('crypto'),
    countlyCommon = require('../../../api/lib/countly.common.js'),
    plugins = require('../../pluginManager.js');

(function (plugin) {
    /**
     *    register internalEvent
     */
    plugins.internalEvents.push('[CLY]_star_rating');
    plugins.internalDrillEvents.push("[CLY]_star_rating");

    /**
     *  register for process new  rating event data.
     *  the original event format like:
     *  { key: '[CLY]_star_rating', count:1, sum:1, segmentation:{ platform:"iOS", version:"3.2", rating:2}
	 *  this function will add a field call "platform_version_rate" in segmentation.
	 *
	 */
    var ratingEventProcess = function (ob) {
        var params = ob.params;
        var events = (params.qstring && params.qstring.events);
        if (events && events.length && Array.isArray(events)) {
            events.forEach(function (event) {
                if (event.key === '[CLY]_star_rating') {
                    event.segmentation['platform_version_rate'] =
                        event.segmentation['platform'] + "**" +
                            event.segmentation['app_version'] + "**" +
                            event.segmentation['rating'] + "**";
                }
            });
        }
    };

    var sendFeedback = function(ob) {
        var params = ob.params;

        if (!params.qstring.app_key || !params.qstring.device_id || params.qstring.widget_id) {
            common.returnMessage(ob.params, 400, 'Missing one of these parameters "device_id","app_key","widget_id"');
            return false;
        }

        if (!params.qstring.rating) {
            common.returnMessage(ob.params, 400, 'Rating parameter can\'t be empty');
            return false;
        } else {
            if (!(parseInt(params.qstring.rating) <= 5 && parseInt(params.qstring.rating) >= 1)) {
                common.returnMessage(ob.params, 400, 'Rating range should be between 1 and 5');
                return false;
            }
        }

        var hasEmail = params.qstring.has_email.toLowerCase() === "true";
        var email = (hasEmail) ? params.qstring.email : '-';
        var comment = params.qstring.comment ? '' : params.qstring.comment;
        var widgetId = params.qstring.widget_id;
        var device = params.qstring.device_id;
        var app = params.qstring.app_key;

        var collectionName = "web_feedback_data_" + app;

        common.db.collection(collectionName)
            .insert({
                "rating":rating,
                "email": email,
                "comment": comment,
                "created_at":Date.now(),
                "widget":widgetId,
                "device":device,
                "app":app
            }, function(err, saved) {
                if (err) {
                    common.returnMessage(ob.params, 400, err.message);
                    return false;
                }
                else {
                    common.returnMessage(ob.params, 201, 'Feedback created.');
                    return true;
                }
            })
        return true;
    }
    var createFeedbackWidget = function(ob) {
        var params = ob.params;
        
        // TODO: Validations
        var popupHeaderText = params.qstring.popup_header_text;
        var popupCommentCallout = params.qstring.popup_comment_callout;
        var popupEmailCallout = params.qstring.popup_email_callout;
        var popupButtonCallout = params.qstring.popup_button_callout;
        var popupThanksMessage = params.qstring.popup_thanks_message;
        var triggerPosition = params.qstring.trigger_position;
        var triggerBgColor = params.qstring.trigger_bg_color;
        var triggerFontColor = params.qstring.trigger_font_color;
        var triggerButtonText = params.qstring.trigger_button_text;
        var targetDevices = params.qstring.target_devices;
        var targetPage = params.qstring.target_page;
        var targetPages = params.qstring.target_pages;
        var isActive = params.qstring.is_active;
        var app = params.qstring.app_key;
        
        var collectionName = "web_feedback_widgets_" + app;

        common.db.collection(collectionName)
            .insert({
                "popup_header_text":popupHeaderText,
                "popup_comment_callout":popupCommentCallout,
                "popup_email_callout":popupEmailCallout,
                "popup_button_callout":popupButtonCallout,
                "popup_thanks_message":popupThanksMessage,
                "trigger_position":triggerPosition,
                "trigger_bg_color":triggerBgColor,
                "trigger_font_color":triggerFontColor,
                "trigger_button_text":triggerButtonText,
                "target_devices":targetDevices,
                "target_page":targetPage,
                "target_pages":targetPages,
                "is_active":isActive
            }, function(err, saved) {
                if (!err) {
                    common.returnMessage(ob.params, 201, "Feedback widget created");
                    return true;
                } else {
                    common.returnMessage(ob.params, 500, err.message);
                    return false;
                }
            })
        return true;
    }
    var removeFeedbackWidget = function(ob) {
        var params = ob.params;

        var widgetId = params.qstring.widget_id;
        var app = params.qstring.app_key;
        var withData = params.qstring.with_data.toLowerCase() === "true";

        var collectionName = "web_feedback_widgets_" + app;

        common.db.collection(collectionName)
            .remove({"_id":common.db.ObjectID(widgetId)}, 
            function(err) {
                if (!err) {
                    // remove widget and related data
                    if (withData) {
                        removeWidgetData(widgetId, app, function(err) {
                            if (err) {
                                common.returnMessage(ob.params, 500, err.message);
                                return false;
                            }
                            else {
                                common.returnMessage(ob.params, 200, 'Widget and related data removed.');
                                return true;
                            }
                        });        
                    } 
                    // remove only widget
                    else {
                        common.returnMessage(ob.params, 200, 'Widget removed.');
                        return true;
                    }
                } else {
                    common.returnMessage(ob.params, 500, err.message);
                    return false;
                }
            })
        return true;
    }
    var editFeedbackWidget = function(ob) {
        var params = ob.params;

        var id = params.qstring.widget_id;
        var app = params.qstring.app_key;
        
        var collectionName = "web_feedback_widgets_"+ app;
        var changes = {};
        
        if (params.qstring.popup_header_text) changes["popup_header_text"] = params.qstring.popup_header_text;
        if (params.qstring.popup_email_callout) changes["popup_email_callout"] = params.qstring.popup_email_callout;
        if (params.qstring.popup_button_callout) changes["popup_button_callout"] = params.qstring.popup_button_callout;
        if (params.qstring.popup_comment_callout) changes["popup_comment_callout"] = params.qstring.popup_comment_callout;
        if (params.qstring.popup_thanks_message) changes["popup_thanks_message"] = params.qstring.popup_thanks_message;
        if (params.qstring.trigger_position) changes["trigger_position"] = params.qstring.trigger_position;
        if (params.qstring.trigger_bg_color) changes["trigger_bg_color"] = params.qstring.trigger_bg_color;
        if (params.qstring.trigger_button_text) changes["trigger_button_text"] = params.qstring.trigger_button_text;
        if (params.qstring.trigger_font_color) changes["trigger_font_color"] = params.qstring.trigger_font_color;
        if (params.qstring.target_devices) changes["target_devices"] = params.qstring.target_devices;
        if (params.qstring.target_page) changes["target_page"] = params.qstring.target_page;
        if (params.qstring.target_pages) changes["target_pages"] = params.qstring.target_pages;
        if (params.qstring.is_active) changes["is_active"] = params.qstring.is_active;

        common.db.collection(collectionName)
            .findAndModify({_id:common.db.ObjectID(id)},{}, changes,
                function(err, widget) {
                    if (!err) {
                        common.returnMessage(ob.params, 200, 'Widget updated');
                        return true;
                    } else {
                        common.returnMessage(ob.params, 500, err.message);
                        return false;
                    }
                })
        return true;
    }
    var removeWidgetData = function(widgetId, app, callback) {
        var collectionName = "web_feedback_data_" + app;

        common.db.collection(collectionName)
            .remove({"widget":widgetId},
            function(err) {
                if (!err) callback(null);
                else callback(err);
            })
    }

    
    plugins.register("/i", ratingEventProcess);
    /*
    * @apiName: SendWebFeedback
    * @type: GET
    * @apiDescription: Send web feedback via countly web sdk
    * @apiParam: 'rating', Integer value between 1 and 5
    * @apiParam: 'email', Email of user who sent feedback
    * @apiParam: 'has_email', Is user shared email address
    * @apiParam: 'comment', Feedback comment
    * @apiParam: 'widget_id', Id of related widget
    * @apiParam: 'app_key', app_key of related app
    * @apiParam: 'device_id', Id of device which sent feedback
    */
    plugins.register("/i/web-feedback/send", sendFeedback);
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
    * @apiParam: 'app_key', app_key of related application
    */
    plugins.register("/i/web-feedback/widgets/create", createFeedbackWidget);
    /*
    * @apiName: RemoveFeedbackWidget
    * @type: GET
    * @apiDescription: Remove web feedback widget from Countly web application
    * @apiParam: 'widget_id', Id of widget which will be removed
    * @apiParam: 'with_data', Boolean property for remove data belong to widget which will be removed with it
    * @apiParam: 'app_key', app_key of related application
    */
    plugins.register("/i/web-feedback/widgets/remove", removeFeedbackWidget);
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
    * @apiParam: 'app_key', app_key of related application
    */
    plugins.register("/i/web-feedback/widgets/edit", editFeedbackWidget);
    /*
    * @apiName: GetFeedbackData
    * @apiDescription: Get feedback data with or without filters
    * @apiParam: 'widget_id', Id of related widget
    * @apiParam: 'rating', filter by rating
    * @apiParam: 'device_id', filter by device_id
    * @apiParam: 'app_key', app_key of related application
    */
    plugins.register('/o/web-feedback/data', function(ob) {
        var params = ob.params;
        var app = params.qstring.app_key;
        var collectionName = 'web_feedback_data_' + app;
        var query = {};
        
        if (params.qstring.widget_id) {
            query["widget"] = params.qstring.widget_id;
        }
        if (params.qstring.rating) {
            query["rating"] = params.qstring.rating;
        }
        if (params.qstring.device_id) {
            query["device"] = params.qstring.device_id;
        }

        common.db.collection(collectionName)
            .find(query)
            .toArray(function(err, docs) {
                if (!err) {
                    common.returnOutput(params, docs);
                    return true;
                } else {
                    common.returnMessage(params, 500, err.message);
                    return false;
                }
            })

        return true;
    });

    /*
    * @apiName: GetWidgetsData
    * @apiDescription: Get feedback widgets with or without filters
    * @apiParam: 'app_key', app_key of related application
    * @apiParam: 'is_active', is_active option for widgets
    */
    plugins.register('/o/web-feedback/widgets', function(ob) {
        var params = ob.params;
        var app = params.qstring.app_key;

        if (typeof app == "undefined") {
            common.returnMessage(ob.params, 400, 'Missing parameter "app_key".');
            return false;
        }
        
        var collectionName = 'web_feedback_widgets_' + app;
        var query = {};
        
        if (params.qstring.is_active) {
            query["is_active"] = params.qstring.is_active;
        }

        common.db.collection(collectionName)
            .find(query)
            .toArray(function(err, docs) {
                if (!err) {
                    common.returnOutput(params, docs);
                    return true;
                } else {
                    common.returnMessage(params, 500, err.message);
                    return false;
                }
            })

        return true;
    });

    /*
    * @apiName: GetOneWidget
    */
    plugins.register('/o/web-feedback/widget', function(ob) {
        var params = ob.params;

        var app = params.qstring.app_key;
        var widgetId = params.qstring.widget_id;

        if (typeof app == "undefined" || typeof widgetId == "undefined") {
            common.returnMessage(ob.params, 400, 'Missing one of these parameters "app_key","widget_id"');
            return false;
        } else {
            var collectionName = 'web_feedback_widgets_' + app;
            console.log(collectionName);
            var query = {};
            
            common.db.collection(collectionName)
                .findOne({"_id":common.db.ObjectID(widgetId)}, function(err, doc) {
                    if (!err) {
                        common.returnOutput(params, doc);
                        return true;
                    } else {
                        common.returnMessage(params, 500, err.message);
                        return false;
                    }
                })

            return true;
        }
    });    

    /**
     * register for fetching platform and version metadata.
     */
    plugins.register('/o', function (ob) {
        var params = ob.params;
        if (params.qstring.method == 'star') {
            if (params.qstring.period) {
                //check if period comes from datapicker
                if (params.qstring.period.indexOf(",") !== -1) {
                    try {
                        params.qstring.period = JSON.parse(params.qstring.period);
                    } catch (SyntaxError) {
                        console.log('Parsing custom period failed!');
                        common.returnMessage(params, 400, 'Bad request parameter: period');
                        return false;
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
                            if(!/([0-9]+)days/.test(params.qstring.period)){
                                common.returnMessage(params, 400, 'Bad request parameter: period');
                                return false;
                            }
                            break;
                    }
                }
            } else {
                common.returnMessage(params, 400, 'Missing request parameter: period');
                return false;
            }

            countlyCommon.setPeriod(params.qstring.period, true);
            //countlyCommon.setTimezone(params.appTimezone, true);
            //console.log(countlyCommon.periodObj,"@@");

            var periodObj = countlyCommon.periodObj;
            var collectionName = 'events' + crypto.createHash('sha1')
                .update('[CLY]_star_rating' + params.qstring.app_id).digest('hex');
            var documents = [];
            for (var i = 0; i < periodObj.reqZeroDbDateIds.length; i++) {
                documents.push("no-segment_" + periodObj.reqZeroDbDateIds[i]);
                for(var m = 0; m < common.base64.length; m++){
                        documents.push("no-segment_" + periodObj.reqZeroDbDateIds[i]+"_"+common.base64[m]);
                    }
            }

            common.db.collection(collectionName).find({'_id': {$in: documents}}).toArray(
                function (err, docs) {
                    if (!err) {
                        var result = {};
                        docs.forEach(function (doc) {
                            if(!doc.meta)
                                doc.meta = {};
                            if(!doc.meta.platform_version_rate)
                                doc.meta.platform_version_rate = [];
                            if(doc.meta_v2 && doc.meta_v2.platform_version_rate){
                                common.arrayAddUniq(doc.meta.platform_version_rate, Object.keys(doc.meta_v2.platform_version_rate));
                            }
                            doc.meta.platform_version_rate.forEach(function (item) {
                                var data = item.split('**');
                                if (result[data[0]] === undefined)
                                    result[data[0]] = [];
                                if (result[data[0]].indexOf(data[1]) === -1) {
                                    result[data[0]].push(data[1]);
                                }
                            });
                        });
                        common.returnOutput(params, result);
                        return true;
                        //common.returnMessage(params, 200, result);
                    }
                }
            );
            return true;
        }
        return false;
    });

}(plugin));

module.exports = plugin;