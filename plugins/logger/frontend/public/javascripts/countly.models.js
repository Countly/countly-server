/*global countlyCommon, jQuery, $*/
(function(countlyLogger) {

    //Private Properties
    var _data = {};
    var _collection_info = {};
    var _state = "";
    //Public Methods
    countlyLogger.initialize = function(query) {
        if (!query) {
            return;
        }

        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "logs",
                "filter": JSON.stringify(query)
            },
            success: function(json) {
                _data = json.logs;
                _state = json.state;
            }
        });
    };

    countlyLogger.collection_info = function() {
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_PARTS.data.r,
            data: {
                "app_id": countlyCommon.ACTIVE_APP_ID,
                "method": "collection_info"
            },
            success: function(json) {
                _collection_info = json;
            }
        });
    };



    countlyLogger.getData = function() {
        return _data;
    };

    countlyLogger.getCollectionInfo = function() {
        return _collection_info;
    };

    countlyLogger.isTurnedOff = function() {
        return _state === "off";
    };

}(window.countlyLogger = window.countlyLogger || {}, jQuery));