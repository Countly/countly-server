import jQuery from 'jquery';
import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';

var _data = {};

var countlySystemLogs = {};

countlySystemLogs.initialize = function() {
    return jQuery.ajax({
        type: "GET",
        url: countlyCommon.API_PARTS.data.r,
        data: {
            "app_id": countlyCommon.ACTIVE_APP_ID,
            "method": "systemlogs_meta"
        },
        success: function(json) {
            _data = json;
        }
    });
};

countlySystemLogs.getMetaData = function() {
    return _data;
};

export default countlySystemLogs;
