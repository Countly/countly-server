/*global countlyCommon, app, jQuery, $*/
(function(starRatingPlugin) {
    var _pv = {};
    // feedbackd datas
    var _fd = {};
    // feedback widget datas
    var _fwd = {};
    var _rating = {};
    var _period = {};
    // widget property names, constant
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

    /**
     * This is for  platform  and version info request
     * @namespace starRatingPlugin
     * @method requestPlatformVersion
     * @param {boolean} isRefresh - is it refresh?
     * @return {func} ajax func to request data and store in _pv
     */
    starRatingPlugin.requestPlatformVersion = function(isRefresh) {
        var periodString = countlyCommon.getPeriodForAjax();
        //returning promise
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

    /**
     * This is for fetching star rating data in a period
     * @namespace starRatingPlugin
     * @method requestRatingInPeriod
     * @param {boolean} isRefresh - is it refresh?
     * @return {func} ajax func to request data and store in _rating
     */
    starRatingPlugin.requestRatingInPeriod = function(isRefresh) {
        var periodString = countlyCommon.getPeriodForAjax();
        //returning promise
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


    /**
     * This is for fetching period object from server side when selected period is 'month' in frontend
     * @namespace starRatingPlugin
     * @method requesPeriod
     * @return {func} ajax func to request data and store in _period
     */
    starRatingPlugin.requesPeriod = function() {
        var periodString = countlyCommon.getPeriodForAjax();

        //returning promise
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

    /**
     * This is for fetching feedback comments objects from server side
     * @namespace starRatingPlugin
     * @method requestFeedbackData
     * @param {object} filterObj -  filter querys for feedback data list
     * @return {func} ajax func to request data and store in _fd
     */
    starRatingPlugin.requestFeedbackData = function(filterObj) {
        var data = {app_id: countlyCommon.ACTIVE_APP_ID};
        if (filterObj.period) {
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
        // returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/feedback/data",
            data: data,
            success: function(json) {
                _fd = json;
            }
        });
    };

    /**
     * This is for fetching feedback comments objects from server side
     * @namespace starRatingPlugin
     * @method requestSingleWidget
     * @param {string} id - id of widget
     * @param {func} callback - callback method
     * @return {func} ajax func to request data and store in _fd
     */
    starRatingPlugin.requestSingleWidget = function(id, callback) {
        // returning promise
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
                app.recordEvent({
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

    /**
     * This is for fetching feedback comments objects from server side
     * @namespace starRatingPlugin
     * @method requestFeedbackData
     * @return {func} ajax func to request data and store in _fd
     */
    starRatingPlugin.requestFeedbackWidgetsData = function() {
        // returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/feedback/widgets",
            data: {
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            success: function(json) {
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

}(window.starRatingPlugin = window.starRatingPlugin || {}, jQuery));