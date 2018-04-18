(function (starRatingPlugin, $) {

    var _pv = {};
    // feedbackd datas
    var _fd = {};
    // feedback widget datas
    var _fwd = {};
    var _rating = {};
    var _period = {};
    /**
     * This is for  platform  and version info request
     * @namespace starRatingPlugin
     * @method requestPlatformVersion
     * @param {}
     * @return {func} ajax func to request data and store in _pv
     */
    starRatingPlugin.requestPlatformVersion = function (isRefresh) {
        var period = countlyCommon.getPeriod();
        var periodString = typeof period === "object" ? "[" + period.toString() + "]" : period;
        //returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o",
            data: {
                api_key: countlyGlobal['member'].api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                method: 'star',
                period: periodString,
                display_loader: !isRefresh
            },
            success: function (json) {
                _pv = json;
            }
        });
    };

    /**
     * This is for fetching star rating data in a period
     * @namespace starRatingPlugin
     * @method requestRatingInPeriod
     * @param {}
     * @return {func} ajax func to request data and store in _rating
     */
    starRatingPlugin.requestRatingInPeriod = function (isRefresh) {
        var period = countlyCommon.getPeriod();
        var periodString = typeof period === "object" ? "[" + period.toString() + "]" : period;

        //returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o",
            data: {
                api_key: countlyGlobal['member'].api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                method: 'events',
                period: periodString,
                event: '[CLY]_star_rating',
                segmentation: 'platform_version_rate',
                display_loader: !isRefresh
            },
            success: function (json) {
                _rating = json;
            }
        });
    };

    /**
     * This is for fetching period object from server side when selected period is 'month' in frontend
     * @namespace starRatingPlugin
     * @method requesPeriod
     * @param {}
     * @return {func} ajax func to request data and store in _period
     */
    starRatingPlugin.requesPeriod = function () {
        var period = countlyCommon.getPeriod();
        var periodString = typeof period === "object" ? "[" + period.toString() + "]" : period;

        //returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o",
            data: {
                api_key: countlyGlobal['member'].api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                method: 'get_period_obj',
                period: periodString
            },
            success: function (json) {
                _period = json;
            }
        });
    };

    /**
     * This is for fetching feedback comments objects from server side 
     * @namespace starRatingPlugin
     * @method requestFeedbackData
     * @param {}
     * @return {func} ajax func to request data and store in _fd
     */
    starRatingPlugin.requestFeedbackData = function() {
        var period = countlyCommon.getPeriod();
        var periodString = typeof period === "object" ? "[" + period.toString() + "]" : period;
        // returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/web-feedback/data",
            data: {
                api_key: countlyGlobal["member"].api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                period: periodString
            },
            success: function (json) {
                _fd = json;
            }
        })
    }

    starRatingPlugin.createFeedbackWidget = function(feedbackWidget, callback) {
        console.log(feedbackWidget);
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/i/web-feedback/widgets/create",
            data: {
                popup_header_text: feedbackWidget.popup_header_text,
                popup_comment_callout: feedbackWidget.popup_comment_callout,
                popup_email_callout: feedbackWidget.popup_email_callout,
                popup_thanks_message: feedbackWidget.popup_thanks_message,
                trigger_position: feedbackWidget.trigger_position,
                trigger_bg_color: feedbackWidget.trigger_bg_color,
                trigger_font_color: feedbackWidget.trigger_font_color,
                trigger_button_text: feedbackWidget.trigger_button_text,
                target_devices: JSON.stringify(feedbackWidget.target_devices),
                target_page: feedbackWidget.target_page,
                target_pages: JSON.stringify(feedbackWidget.target_pages),
                is_active: feedbackWidget.is_active,
                app_id: countlyCommon.ACTIVE_APP_ID
            },
            success: function (json, textStatus, xhr) {
                callback(json, xhr.status);
            }
        })
    }

    /**
     * This is for fetching feedback comments objects from server side 
     * @namespace starRatingPlugin
     * @method requestFeedbackData
     * @param {}
     * @return {func} ajax func to request data and store in _fd
     */
    starRatingPlugin.requestFeedbackWidgetsData = function() {
        var period = countlyCommon.getPeriod();
        var periodString = typeof period === "object" ? "[" + period.toString() + "]" : period;
        // returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/web-feedback/widgets",
            data: {
                api_key: countlyGlobal["member"].api_key,
                app_id: countlyCommon.ACTIVE_APP_ID,
                period: periodString
            },
            success: function (json) {
                _fwd = json;
            }
        })        
    }

    starRatingPlugin.getFeedbackData = function () {
        return _fd;
    }

    starRatingPlugin.getFeedbackWidgetsData = function () {
        return _fwd;
    }

    starRatingPlugin.getPlatformVersion = function () {
        return _pv;
    };

    starRatingPlugin.getRatingInPeriod = function () {
        return _rating;
    };
    starRatingPlugin.getPeriod = function () {
        return _period;
    }

}(window.starRatingPlugin = window.starRatingPlugin || {}, jQuery));