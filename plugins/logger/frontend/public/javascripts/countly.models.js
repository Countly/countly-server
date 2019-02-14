/*global countlyCommon, jQuery, $*/
(function(countlyLogger) {

    //Private Properties
    var _data = {};
    var _collection_info = {};
    //Public Methods
    countlyLogger.initialize = function(filter) {
        var query = {};
        if (filter) {
            if (filter.types) {
                query["t." + filter.types] = {$exists: true};
            }
            else if (filter.source) {
                query.src = filter.source;
            }
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
                _data = json;
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

}(window.countlyLogger = window.countlyLogger || {}, jQuery));