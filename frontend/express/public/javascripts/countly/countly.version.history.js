/* global countlyCommon, jQuery */
(function(countlyVersionHistoryManager, $) {
    //we will store our data here
    var _data = {};
    //Initializing model
    countlyVersionHistoryManager.initialize = function() {
        //returning promise
        return $.ajax({
            type: "GET",
            url: countlyCommon.API_URL + "/o/countly_version",
            data: {},
            success: function(json) {
                //got our data, let's store it
                _data = json.result;
            },
            error: function(/*exception*/) {}
        });
    };
    //return data that we have
    countlyVersionHistoryManager.getData = function(detailed) {
        if (detailed) {
            return _data;
        }
        return _data.fs;
    };
}(window.countlyVersionHistoryManager = window.countlyVersionHistoryManager || {}, jQuery));