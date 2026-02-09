import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';

var _pv = {};
var _fd = {};
var _fwd = {};
var _rating = {};
var _period = {};

var widgetProperties = [
    "popup_header_text",
    "popup_comment_callout",
    "popup_email_callout",
    "popup_button_callout",
    "popup_thanks_message",
    "trigger_position",
    "trigger_bg_color",
    "trigger_font_color",
    "trigger_button_text",
    "target_devices",
    "target_page",
    "target_pages",
    "hide_sticker",
    "trigger_size",
    "comment_enable",
    "contact_enable",
    "targeting",
    "ratings_texts",
    "rating_symbol",
    "status",
    "logo",
    "logoType",
    "globalLogo",
    "internalName",
    "consent",
    "links",
    "finalText"
];

var widgetJSONProperties = [
    "targeting",
    "ratings_texts",
    "target_pages",
    "links"
];

var starRatingPlugin = {};

starRatingPlugin.bulkUpdateWidgetStatus = function(payload) {
    return $.ajax({
        type: 'POST',
        url: countlyCommon.API_URL + "/i/feedback/widgets/status",
        data: {
            app_id: countlyCommon.ACTIVE_APP_ID,
            data: JSON.stringify(payload)
        },
        dataType: 'json'
    }, { disableAutoCatch: true });
};

starRatingPlugin.extractWidgetProperties = function(props) {
    var data = widgetProperties.reduce(function(newData, key) {
        newData[key] = props[key];
        return newData;
    }, {});

    widgetJSONProperties.forEach(function(prop) {
        if (data[prop]) {
            data[prop] = JSON.stringify(data[prop]);
        }
    });

    return data;
};

starRatingPlugin.requestPlatformVersion = function(isRefresh) {
    var periodString = countlyCommon.getPeriodForAjax();
    return $.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/o",
        data: {
            app_id: countlyCommon.ACTIVE_APP_ID,
            method: 'star',
            period: periodString,
            display_loader: !isRefresh
        },
        success: function(json) {
            _pv = json;
        }
    });
};

starRatingPlugin.requestRatingInPeriod = function(isRefresh) {
    var periodString = countlyCommon.getPeriodForAjax();
    return $.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/o",
        data: {
            app_id: countlyCommon.ACTIVE_APP_ID,
            method: 'events',
            period: periodString,
            event: '[CLY]_star_rating',
            segmentation: 'platform_version_rate',
            display_loader: !isRefresh
        },
        success: function(json) {
            _rating = json;
        }
    });
};

starRatingPlugin.requesPeriod = function() {
    var periodString = countlyCommon.getPeriodForAjax();
    return $.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/o",
        data: {
            app_id: countlyCommon.ACTIVE_APP_ID,
            method: 'get_period_obj',
            period: periodString
        },
        success: function(json) {
            _period = json;
        }
    });
};

starRatingPlugin.requestFeedbackData = function(filterObj) {
    var data = {app_id: countlyCommon.ACTIVE_APP_ID};
    if (filterObj && filterObj.period) {
        if (filterObj.period !== 'noperiod') {
            data.period = filterObj.period;
        }
    }
    else {
        var periodString = countlyCommon.getPeriodForAjax();
        data.period = periodString;
    }

    if (filterObj) {
        if (filterObj.rating && filterObj.rating !== "") {
            data.rating = filterObj.rating;
        }
        if (filterObj.version && filterObj.version !== "") {
            data.version = filterObj.version.replace(":", ".");
        }
        if (filterObj.platform && filterObj.platform !== "") {
            data.platform = filterObj.platform;
        }
        if (filterObj.widget && filterObj.widget !== "") {
            data.widget_id = filterObj.widget;
        }
        if (filterObj.uid && filterObj.uid !== "") {
            data.uid = filterObj.uid;
        }
    }
    return $.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/o/feedback/data",
        data: data,
        success: function(json) {
            _fd = json;
        }
    });
};

starRatingPlugin.requestSingleWidget = function(id, callback) {
    return $.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/o/feedback/widget",
        data: {
            widget_id: id,
            app_id: countlyCommon.ACTIVE_APP_ID
        },
        success: function(json) {
            callback(json);
        }
    });
};

starRatingPlugin.createFeedbackWidget = function(feedbackWidget, callback) {
    var data = starRatingPlugin.extractWidgetProperties(feedbackWidget);
    data.app_id = countlyCommon.ACTIVE_APP_ID;

    return $.ajax({
        type: "POST",
        url: countlyCommon.API_URL + "/i/feedback/widgets/create",
        data: data,
        success: function(json, textStatus, xhr) {
            callback(json, xhr.status);
            window.app.recordEvent({
                "key": "feedback-widget-create",
                "count": 1,
                "segmentation": {}
            });
        }
    });
};

starRatingPlugin.editFeedbackWidget = function(feedbackWidget, callback) {
    var data = starRatingPlugin.extractWidgetProperties(feedbackWidget);
    data.app_id = countlyCommon.ACTIVE_APP_ID;
    data.widget_id = feedbackWidget._id;

    return $.ajax({
        type: "POST",
        url: countlyCommon.API_URL + "/i/feedback/widgets/edit",
        data: data,
        success: function(json, textStatus, xhr) {
            callback(json, xhr.status);
        }
    });
};

starRatingPlugin.removeFeedbackWidget = function(widget_id, with_data, callback) {
    return $.ajax({
        type: "POST",
        url: countlyCommon.API_URL + "/i/feedback/widgets/remove",
        data: {
            app_id: countlyCommon.ACTIVE_APP_ID,
            widget_id: widget_id,
            with_data: true
        },
        success: function(json, textStatus, xhr) {
            callback(json, xhr.status);
        }
    });
};

starRatingPlugin.requestFeedbackWidgetsData = function() {
    return $.ajax({
        type: "GET",
        url: countlyCommon.API_URL + "/o/feedback/widgets",
        data: {
            app_id: countlyCommon.ACTIVE_APP_ID
        },
        success: function(json) {
            json.forEach(function(row) {
                if (typeof row?.internalName === "string") {
                    row.internalName = countlyCommon.unescapeHtml(row.internalName);
                }
                if (typeof row?.targeting?.user_segmentation === "string") {
                    row.targeting.user_segmentation = countlyCommon.unescapeHtml(row.targeting.user_segmentation);
                }
            });
            _fwd = json;
        }
    });
};

starRatingPlugin.getFeedbackData = function() {
    return _fd;
};

starRatingPlugin.getFeedbackWidgetsData = function() {
    return _fwd;
};

starRatingPlugin.getPlatformVersion = function() {
    return _pv;
};

starRatingPlugin.getRatingInPeriod = function() {
    return _rating;
};

starRatingPlugin.getPeriod = function() {
    return _period;
};

export default starRatingPlugin;
