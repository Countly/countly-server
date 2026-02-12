import { countlyCommon } from '../../../../../frontend/express/public/javascripts/countly/countly.common.js';
import { alert as CountlyAlert } from '../../../../../frontend/express/public/javascripts/countly/countly.helpers.js';
import jQuery from 'jquery';

export const countlyLogger = {
    getRequestLogs(query) {
        query = query || {};
        return jQuery.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "logs",
                "filter": JSON.stringify(query)
            },
            success: function(json) {
                return json;
            },
            error: function(xhr, status, error) {
                if (error && status !== 'abort') {
                    CountlyAlert(error, "red");
                }
            }
        });
    },

    getCollectionInfo() {
        return jQuery.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "collection_info"
            },
            success: function(json) {
                return json;
            },
            error: function(xhr, status, error) {
                if (error && status !== 'abort') {
                    CountlyAlert(error, "red");
                }
            }
        });
    }
}

export default countlyLogger;
